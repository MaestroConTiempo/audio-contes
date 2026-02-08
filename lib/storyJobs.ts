import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StoryState } from '@/lib/storyData';
import { AudioGenerationError, generateAudioForStory } from '@/lib/audioGeneration';
import { generateStoryWithOpenAI } from '@/lib/storyGeneration';

type StoryJob = {
  id: string;
  story_id: string;
  user_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at?: string | null;
};

type StoryRow = {
  id: string;
  user_id: string;
  inputs: StoryState | null;
  status: string | null;
};

export type ProcessStoryJobsResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  errors: string[];
};

export type ProcessStoryJobsOptions = {
  maxJobs?: number;
  onlyStoryId?: string;
};

const nowIso = () => new Date().toISOString();
const DEFAULT_STALE_PROCESSING_MS = 5 * 60 * 1000;
const MIN_STALE_PROCESSING_MS = 60 * 1000;
const MAX_STALE_PROCESSING_MS = 60 * 60 * 1000;

const clampMaxJobs = (value?: number) => {
  if (!value || Number.isNaN(value)) return 5;
  return Math.max(1, Math.min(20, Math.floor(value)));
};

const getStaleProcessingMs = () => {
  const raw = process.env.STORY_JOB_STALE_MS;
  if (!raw) return DEFAULT_STALE_PROCESSING_MS;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return DEFAULT_STALE_PROCESSING_MS;
  return Math.max(MIN_STALE_PROCESSING_MS, Math.min(MAX_STALE_PROCESSING_MS, parsed));
};

async function claimNextPendingJob(onlyStoryId?: string): Promise<StoryJob | null> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from('story_jobs')
    .select('id,story_id,user_id,status,attempts,last_error,updated_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (onlyStoryId) {
    query = query.eq('story_id', onlyStoryId);
  }

  const { data: pendingJobs, error: pendingError } = await query;
  if (pendingError) {
    throw new Error(`No se pudieron listar jobs pendientes: ${pendingError.message}`);
  }

  let candidate = pendingJobs?.[0] as StoryJob | undefined;

  if (!candidate) {
    const staleCutoffIso = new Date(Date.now() - getStaleProcessingMs()).toISOString();

    let staleQuery = supabase
      .from('story_jobs')
      .select('id,story_id,user_id,status,attempts,last_error,updated_at')
      .eq('status', 'processing')
      .lt('updated_at', staleCutoffIso)
      .order('updated_at', { ascending: true })
      .limit(1);

    if (onlyStoryId) {
      staleQuery = staleQuery.eq('story_id', onlyStoryId);
    }

    const { data: staleJobs, error: staleError } = await staleQuery;
    if (staleError) {
      throw new Error(`No se pudieron listar jobs atascados: ${staleError.message}`);
    }

    candidate = staleJobs?.[0] as StoryJob | undefined;
  }

  if (!candidate) {
    return null;
  }

  const claimedAt = nowIso();
  const retryError =
    candidate.status === 'processing' ? `Reintentando job atascado (${claimedAt})` : null;

  const { data: claimed, error: claimError } = await supabase
    .from('story_jobs')
    .update({
      status: 'processing',
      attempts: (candidate.attempts || 0) + 1,
      updated_at: claimedAt,
      last_error: retryError,
    })
    .eq('id', candidate.id)
    .eq('status', candidate.status)
    .select('id,story_id,user_id,status,attempts,last_error,updated_at')
    .maybeSingle<StoryJob>();

  if (claimError) {
    throw new Error(`No se pudo tomar el job ${candidate.id}: ${claimError.message}`);
  }

  return claimed ?? null;
}

async function markJobCompleted(jobId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('story_jobs')
    .update({
      status: 'completed',
      updated_at: nowIso(),
      last_error: null,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`No se pudo marcar job completado (${jobId}): ${error.message}`);
  }
}

async function markJobFailed(jobId: string, lastError: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('story_jobs')
    .update({
      status: 'error',
      updated_at: nowIso(),
      last_error: lastError,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`No se pudo marcar job con error (${jobId}): ${error.message}`);
  }
}

async function updateStoryStatus(
  storyId: string,
  values: {
    status: string;
    title?: string;
    story_text?: string;
    generation_error?: string | null;
    generated_at?: string | null;
  }
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('stories').update(values).eq('id', storyId);
  if (error) {
    throw new Error(`No se pudo actualizar story ${storyId}: ${error.message}`);
  }
}

async function processClaimedJob(job: StoryJob): Promise<'completed' | 'failed' | 'skipped'> {
  const supabase = createSupabaseAdminClient();

  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('id,user_id,inputs,status')
    .eq('id', job.story_id)
    .single<StoryRow>();

  if (storyError || !story) {
    await markJobFailed(job.id, `Story no encontrada: ${storyError?.message || 'sin datos'}`);
    return 'failed';
  }

  if (!story.inputs || typeof story.inputs !== 'object') {
    await updateStoryStatus(story.id, {
      status: 'error',
      generation_error: 'inputs inválidos o vacíos',
    });
    await markJobFailed(job.id, 'inputs inválidos o vacíos');
    return 'failed';
  }

  if (story.status && !['pending', 'generating_story', 'generating_audio'].includes(story.status)) {
    await markJobCompleted(job.id);
    return 'skipped';
  }

  try {
    await updateStoryStatus(story.id, {
      status: 'generating_story',
      generation_error: null,
    });

    const generated = await generateStoryWithOpenAI(story.inputs);

    await updateStoryStatus(story.id, {
      status: 'generated',
      title: generated.title,
      story_text: generated.storyText,
      generated_at: nowIso(),
      generation_error: null,
    });

    const narratorVoiceId = story.inputs.narrator?.optionId?.trim() || null;
    if (narratorVoiceId) {
      await updateStoryStatus(story.id, {
        status: 'generating_audio',
      });

      try {
        await generateAudioForStory({
          supabase,
          storyId: story.id,
          userId: story.user_id,
          voiceId: narratorVoiceId,
        });
        await updateStoryStatus(story.id, {
          status: 'ready',
        });
      } catch (audioError) {
        if (audioError instanceof AudioGenerationError) {
          console.error(`[worker] Audio error story ${story.id}:`, audioError.message);
        } else {
          console.error(`[worker] Audio error story ${story.id}:`, audioError);
        }
        await updateStoryStatus(story.id, {
          status: 'generated',
        });
      }
    }

    await markJobCompleted(job.id);
    return 'completed';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    await updateStoryStatus(story.id, {
      status: 'error',
      generation_error: errorMessage.slice(0, 1000),
    });
    await markJobFailed(job.id, errorMessage.slice(0, 1000));
    return 'failed';
  }
}

export async function processStoryJobs(
  options?: ProcessStoryJobsOptions
): Promise<ProcessStoryJobsResult> {
  const maxJobs = clampMaxJobs(options?.maxJobs);
  const onlyStoryId = options?.onlyStoryId?.trim();

  const result: ProcessStoryJobsResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < maxJobs; i += 1) {
    let job: StoryJob | null = null;
    try {
      job = await claimNextPendingJob(onlyStoryId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al tomar job';
      result.errors.push(message);
      break;
    }

    if (!job) {
      break;
    }

    result.processed += 1;

    try {
      const status = await processClaimedJob(job);
      if (status === 'completed') result.completed += 1;
      if (status === 'failed') result.failed += 1;
      if (status === 'skipped') result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : 'Error procesando job';
      result.errors.push(`job ${job.id}: ${message}`);
      try {
        await markJobFailed(job.id, message.slice(0, 1000));
      } catch (markError) {
        const markMessage =
          markError instanceof Error ? markError.message : 'Error marcando job con error';
        result.errors.push(`job ${job.id}: ${markMessage}`);
      }
    }

    if (onlyStoryId) {
      break;
    }
  }

  return result;
}
