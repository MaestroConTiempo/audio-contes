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
  title?: string | null;
  story_text?: string | null;
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
const DEFAULT_STALE_PROCESSING_MS = 30 * 60 * 1000;
const MIN_STALE_PROCESSING_MS = 60 * 1000;
const MAX_STALE_PROCESSING_MS = 60 * 60 * 1000;
const DEFAULT_AUDIO_TIMEOUT_MS = 15 * 60 * 1000;
const STALE_AUDIO_BUFFER_MS = 2 * 60 * 1000;
const JOB_HEARTBEAT_MS = 30 * 1000;

const clampMaxJobs = (value?: number) => {
  if (!value || Number.isNaN(value)) return 5;
  return Math.max(1, Math.min(20, Math.floor(value)));
};

const parseMsEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

const getAudioTimeoutMs = () => {
  const configuredTimeout = parseMsEnv(
    process.env.GENAIPRO_TIMEOUT_MS ?? process.env.ELEVENLABS_TIMEOUT_MS,
    DEFAULT_AUDIO_TIMEOUT_MS
  );
  return Math.max(60 * 1000, configuredTimeout);
};

const getStaleProcessingMs = () => {
  const minimumForAudio = getAudioTimeoutMs() + STALE_AUDIO_BUFFER_MS;
  const raw = process.env.STORY_JOB_STALE_MS;

  if (!raw) {
    return Math.max(DEFAULT_STALE_PROCESSING_MS, minimumForAudio);
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return Math.max(DEFAULT_STALE_PROCESSING_MS, minimumForAudio);
  }

  const clamped = Math.max(MIN_STALE_PROCESSING_MS, Math.min(MAX_STALE_PROCESSING_MS, parsed));
  return Math.max(clamped, minimumForAudio);
};

function startJobHeartbeat(jobId: string) {
  const supabase = createSupabaseAdminClient();
  let isStopped = false;
  let isUpdating = false;

  const interval = setInterval(() => {
    if (isStopped || isUpdating) return;
    isUpdating = true;

    void (async () => {
      try {
        const { error } = await supabase
          .from('story_jobs')
          .update({ updated_at: nowIso() })
          .eq('id', jobId)
          .eq('status', 'processing');

        if (error) {
          console.error(`[worker] Heartbeat error job ${jobId}: ${error.message}`);
        }
      } catch (error) {
        console.error(`[worker] Heartbeat exception job ${jobId}:`, error);
      } finally {
        isUpdating = false;
      }
    })();
  }, JOB_HEARTBEAT_MS);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }

  return () => {
    isStopped = true;
    clearInterval(interval);
  };
}

async function hasReadyAudio(storyId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('audios')
    .select('id')
    .eq('story_id', storyId)
    .eq('status', 'ready')
    .not('audio_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo comprobar audio ready para story ${storyId}: ${error.message}`);
  }

  return Boolean(data?.id);
}

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

async function markJobPending(jobId: string, lastError?: string | null) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('story_jobs')
    .update({
      status: 'pending',
      updated_at: nowIso(),
      last_error: lastError ?? null,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`No se pudo reencolar job (${jobId}): ${error.message}`);
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
  const stopHeartbeat = startJobHeartbeat(job.id);
  const supabase = createSupabaseAdminClient();

  try {
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id,user_id,inputs,status,title,story_text')
      .eq('id', job.story_id)
      .single<StoryRow>();

    if (storyError || !story) {
      await markJobFailed(job.id, `Story no encontrada: ${storyError?.message || 'sin datos'}`);
      return 'failed';
    }

    if (!story.inputs || typeof story.inputs !== 'object') {
      await updateStoryStatus(story.id, {
        status: 'error',
        generation_error: 'inputs invalidos o vacios',
      });
      await markJobFailed(job.id, 'inputs invalidos o vacios');
      return 'failed';
    }

    if (
      story.status &&
      !['pending', 'generating_story', 'generating_audio', 'generated'].includes(story.status)
    ) {
      await markJobCompleted(job.id);
      return 'skipped';
    }

    const existingStoryText = story.story_text?.trim() ?? '';

    if (!existingStoryText) {
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
    } else if (story.status === 'pending' || story.status === 'generating_story') {
      await updateStoryStatus(story.id, {
        status: 'generated',
        generation_error: null,
      });
    }

    const narratorVoiceId = story.inputs.narrator?.optionId?.trim() || null;
    if (narratorVoiceId) {
      const alreadyReady = await hasReadyAudio(story.id);

      if (alreadyReady) {
        await updateStoryStatus(story.id, {
          status: 'ready',
          generation_error: null,
        });
      } else {
        await updateStoryStatus(story.id, {
          status: 'generating_audio',
          generation_error: null,
        });

        try {
          const audioResult = await generateAudioForStory({
            supabase,
            storyId: story.id,
            userId: story.user_id,
            voiceId: narratorVoiceId,
          });

          if (audioResult.status === 'ready') {
            await updateStoryStatus(story.id, {
              status: 'ready',
              generation_error: null,
            });
          } else {
            await updateStoryStatus(story.id, {
              status: 'generating_audio',
              generation_error: null,
            });
            await markJobPending(job.id, 'Esperando audio de GenAIPro');
            return 'skipped';
          }
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
    }

    await markJobCompleted(job.id);
    return 'completed';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    try {
      await updateStoryStatus(job.story_id, {
        status: 'error',
        generation_error: errorMessage.slice(0, 1000),
      });
    } catch (updateError) {
      console.error(`[worker] No se pudo actualizar story ${job.story_id} a error:`, updateError);
    }

    try {
      await markJobFailed(job.id, errorMessage.slice(0, 1000));
    } catch (jobError) {
      console.error(`[worker] No se pudo marcar job ${job.id} como error:`, jobError);
    }
    return 'failed';
  } finally {
    stopHeartbeat();
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
