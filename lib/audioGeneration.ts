import type { SupabaseClient } from '@supabase/supabase-js';

const GENAIPRO_API_BASE = 'https://genaipro.vn/api/v1';
const DEFAULT_AUDIO_BUCKET = 'audios';
const DEFAULT_MAX_CHARS = 10000;
const DEFAULT_TIMEOUT_MS = 900000;
const TASK_STORAGE_PREFIX = 'genaipro_task:';

export type AudioStatus = 'pending' | 'ready' | 'error';

export type AudioGenerationResult =
  | {
      id: string;
      story_id: string;
      voice_id: string;
      status: 'pending';
      task_id: string | null;
    }
  | {
      id: string;
      story_id: string;
      voice_id: string;
      status: 'ready';
      storage_path: string;
      audio_url: string;
      generated_at: string;
    };

export class AudioGenerationError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(message: string, status = 500, code?: string, detail?: string) {
    super(message);
    this.name = 'AudioGenerationError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const parseNumberEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseFloatEnv = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseRangedFloatEnv = (value: string | undefined, min: number, max: number) => {
  const parsed = parseFloatEnv(value);
  if (parsed === undefined) return undefined;
  if (parsed < min || parsed > max) return undefined;
  return parsed;
};

const parseBooleanEnv = (value: string | undefined) => {
  if (!value) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
};

const classifyGenaiproError = (errorText: string) => {
  const lower = errorText.toLowerCase();
  if (lower.includes('quota') || lower.includes('credit') || lower.includes('balance')) {
    return { code: 'credits_or_quota', message: 'Creditos insuficientes en GenAIPro' };
  }
  if (lower.includes('character') || lower.includes('characters') || lower.includes('length')) {
    return { code: 'provider_char_limit', message: 'Limite de caracteres de GenAIPro' };
  }
  if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('token')) {
    return { code: 'auth_error', message: 'Token invalido o no autorizado en GenAIPro' };
  }
  return { code: 'genaipro_error', message: 'Error al generar audio' };
};

const nowIso = () => new Date().toISOString();

const parseTaskIdFromStoragePath = (value?: string | null) => {
  if (!value) return null;
  if (!value.startsWith(TASK_STORAGE_PREFIX)) return null;
  const taskId = value.slice(TASK_STORAGE_PREFIX.length).trim();
  return taskId || null;
};

type GenerateAudioArgs = {
  supabase: SupabaseClient;
  storyId: string;
  userId: string;
  voiceId?: string | null;
  logger?: Pick<Console, 'log' | 'error'>;
};

type AudioRow = {
  id: string;
  story_id: string;
  voice_id: string | null;
  status: AudioStatus;
  storage_path: string | null;
  audio_url: string | null;
  created_at?: string | null;
  generated_at?: string | null;
  generation_error?: string | null;
};

async function getOrCreatePendingAudio(args: {
  supabase: SupabaseClient;
  storyId: string;
  userId: string;
  voiceId: string;
  logger: Pick<Console, 'log' | 'error'>;
}): Promise<AudioRow> {
  const { supabase, storyId, userId, voiceId, logger } = args;

  const { data: existingPending, error: existingError } = await supabase
    .from('audios')
    .select(
      'id,story_id,voice_id,status,storage_path,audio_url,created_at,generated_at,generation_error'
    )
    .eq('story_id', storyId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<AudioRow>();

  if (existingError) {
    logger.error('Error al consultar audio pendiente existente:', existingError);
    throw new AudioGenerationError(
      `No se pudo consultar audio pendiente: ${existingError.message}`,
      500,
      'audio_pending_query_failed'
    );
  }

  if (existingPending) {
    if (!existingPending.voice_id && voiceId) {
      const { error: voiceUpdateError } = await supabase
        .from('audios')
        .update({ voice_id: voiceId })
        .eq('id', existingPending.id);

      if (voiceUpdateError) {
        logger.error('No se pudo actualizar voice_id del audio pendiente:', voiceUpdateError);
      } else {
        existingPending.voice_id = voiceId;
      }
    }
    return existingPending;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('audios')
    .insert({
      story_id: storyId,
      voice_id: voiceId,
      status: 'pending' as AudioStatus,
      storage_path: null,
      audio_url: null,
      generated_at: null,
      generation_error: null,
      user_id: userId,
    })
    .select(
      'id,story_id,voice_id,status,storage_path,audio_url,created_at,generated_at,generation_error'
    )
    .single<AudioRow>();

  if (insertError || !inserted) {
    logger.error('Error al insertar audio pendiente:', insertError);
    throw new AudioGenerationError(
      `No se pudo crear el audio pendiente${insertError?.message ? `: ${insertError.message}` : ''}`,
      500,
      'audio_insert_failed'
    );
  }

  return inserted;
}

export async function generateAudioForStory({
  supabase,
  storyId,
  userId,
  voiceId,
  logger = console,
}: GenerateAudioArgs): Promise<AudioGenerationResult> {
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('id,title,story_text,user_id')
    .eq('id', storyId)
    .eq('user_id', userId)
    .single();

  if (storyError || !story?.story_text) {
    logger.error('No se encontro el cuento para audio:', storyError);
    throw new AudioGenerationError('No se encontro el cuento', 404, 'story_not_found');
  }

  const effectiveVoiceId = voiceId?.trim() || process.env.GENAIPRO_VOICE_ID || '';
  if (!effectiveVoiceId) {
    throw new AudioGenerationError('voice_id es requerido', 400, 'voice_required');
  }

  const pendingAudio = await getOrCreatePendingAudio({
    supabase,
    storyId,
    userId,
    voiceId: effectiveVoiceId,
    logger,
  });

  const updateAudioStatus = async (
    status: AudioStatus,
    options?: {
      storagePath?: string | null;
      audioUrl?: string | null;
      generationError?: string | null;
      generatedAt?: string | null;
    }
  ) => {
    const { error } = await supabase
      .from('audios')
      .update({
        status,
        storage_path: options?.storagePath ?? null,
        audio_url: options?.audioUrl ?? null,
        generation_error: options?.generationError ?? null,
        generated_at: options?.generatedAt ?? null,
      })
      .eq('id', pendingAudio.id);

    if (error) {
      logger.error('Error al actualizar audio:', error);
    }
  };

  const titleLine = story.title ? `Titulo: ${story.title}\n\n` : '';
  const audioText = `${titleLine}${story.story_text}`;
  const maxChars = parseNumberEnv(process.env.GENAIPRO_MAX_CHARS, DEFAULT_MAX_CHARS);

  if (audioText.length > maxChars) {
    const message = 'El cuento supera el limite de caracteres para audio';
    const detail = `Longitud: ${audioText.length}. Maximo: ${maxChars}.`;
    await updateAudioStatus('error', { generationError: `${message}. ${detail}`, generatedAt: nowIso() });
    throw new AudioGenerationError(message, 400, 'max_chars', detail);
  }

  const genaiproApiKey = process.env.GENAIPRO_API_KEY;
  if (!genaiproApiKey) {
    const message = 'GENAIPRO_API_KEY no configurado';
    await updateAudioStatus('error', { generationError: message, generatedAt: nowIso() });
    throw new AudioGenerationError(message, 500, 'config_missing');
  }

  const timeoutMs = parseNumberEnv(process.env.GENAIPRO_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  const modelId = 'eleven_turbo_v2_5';
  const style = parseFloatEnv(process.env.GENAIPRO_STYLE);
  const speed = parseRangedFloatEnv(process.env.GENAIPRO_SPEED, 0.7, 1.2);
  const similarity = parseFloatEnv(process.env.GENAIPRO_SIMILARITY);
  const stability = parseFloatEnv(process.env.GENAIPRO_STABILITY);
  const useSpeakerBoost = parseBooleanEnv(process.env.GENAIPRO_USE_SPEAKER_BOOST);

  if (process.env.GENAIPRO_SPEED && speed === undefined) {
    logger.error(
      'GENAIPRO_SPEED fuera de rango. Se ignora y se usa el valor por defecto del provider.'
    );
  }

  let taskId = parseTaskIdFromStoragePath(pendingAudio.storage_path);

  try {
    if (!taskId) {
      const taskPayload: Record<string, unknown> = {
        input: audioText,
        voice_id: effectiveVoiceId,
        model_id: modelId,
      };

      if (style !== undefined) taskPayload.style = style;
      if (speed !== undefined) taskPayload.speed = speed;
      if (similarity !== undefined) taskPayload.similarity = similarity;
      if (stability !== undefined) taskPayload.stability = stability;
      if (useSpeakerBoost !== undefined) taskPayload.use_speaker_boost = useSpeakerBoost;

      const createResponse = await fetch(`${GENAIPRO_API_BASE}/labs/task`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${genaiproApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskPayload),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        const classified = classifyGenaiproError(errorText);
        await updateAudioStatus('error', {
          generationError: errorText.slice(0, 500),
          generatedAt: nowIso(),
        });
        throw new AudioGenerationError(
          classified.message,
          502,
          classified.code,
          errorText.slice(0, 500)
        );
      }

      const createData = await createResponse.json().catch(() => null);
      taskId = (createData?.task_id as string | undefined) ?? null;

      if (!taskId) {
        await updateAudioStatus('error', {
          generationError: 'GenAIPro no devolvio task_id',
          generatedAt: nowIso(),
        });
        throw new AudioGenerationError(
          'GenAIPro no devolvio task_id',
          502,
          'provider_bad_response'
        );
      }

      await updateAudioStatus('pending', {
        storagePath: `${TASK_STORAGE_PREFIX}${taskId}`,
        audioUrl: null,
        generationError: null,
        generatedAt: null,
      });

      return {
        id: pendingAudio.id,
        story_id: storyId,
        voice_id: effectiveVoiceId,
        status: 'pending',
        task_id: taskId,
      };
    }

    const statusResponse = await fetch(`${GENAIPRO_API_BASE}/labs/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${genaiproApiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      const classified = classifyGenaiproError(errorText);
      await updateAudioStatus('error', {
        generationError: errorText.slice(0, 500),
        generatedAt: nowIso(),
      });
      throw new AudioGenerationError(
        classified.message,
        502,
        classified.code,
        errorText.slice(0, 500)
      );
    }

    const statusData = await statusResponse.json().catch(() => null);
    const providerStatus = statusData?.status as string | undefined;

    if (providerStatus !== 'completed') {
      if (providerStatus === 'error') {
        const detail =
          typeof statusData?.error === 'string'
            ? statusData.error
            : 'Error en la tarea de GenAIPro';
        await updateAudioStatus('error', {
          generationError: detail,
          generatedAt: nowIso(),
        });
        throw new AudioGenerationError(detail, 502, 'provider_task_error');
      }

      const createdAtMs = pendingAudio.created_at ? Date.parse(pendingAudio.created_at) : NaN;
      const isTimedOut =
        !Number.isNaN(createdAtMs) && Date.now() - createdAtMs > Math.max(timeoutMs, 60 * 1000);

      if (isTimedOut) {
        const message = 'Tiempo de espera agotado en GenAIPro';
        await updateAudioStatus('error', {
          generationError: message,
          generatedAt: nowIso(),
        });
        throw new AudioGenerationError(message, 504, 'provider_timeout');
      }

      return {
        id: pendingAudio.id,
        story_id: storyId,
        voice_id: effectiveVoiceId,
        status: 'pending',
        task_id: taskId,
      };
    }

    const resultUrl = (statusData?.result as string | undefined) ?? null;
    if (!resultUrl) {
      await updateAudioStatus('error', {
        generationError: 'GenAIPro no devolvio result URL',
        generatedAt: nowIso(),
      });
      throw new AudioGenerationError('GenAIPro no devolvio result URL', 502, 'provider_bad_response');
    }

    const audioResponse = await fetch(resultUrl);
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      await updateAudioStatus('error', {
        generationError: errorText.slice(0, 500),
        generatedAt: nowIso(),
      });
      throw new AudioGenerationError(
        'No se pudo descargar el audio',
        502,
        'provider_audio_download',
        errorText.slice(0, 500)
      );
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      const message = 'Audio vacio';
      await updateAudioStatus('error', { generationError: message, generatedAt: nowIso() });
      throw new AudioGenerationError(message, 502, 'empty_audio');
    }

    const audioBucket =
      process.env.GENAIPRO_AUDIO_BUCKET ||
      process.env.ELEVENLABS_AUDIO_BUCKET ||
      DEFAULT_AUDIO_BUCKET;

    const storagePath = `users/${userId}/stories/${storyId}/${pendingAudio.id}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from(audioBucket)
      .upload(storagePath, Buffer.from(audioBuffer), {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      await updateAudioStatus('error', {
        generationError: uploadError.message,
        generatedAt: nowIso(),
      });
      throw new AudioGenerationError('Error al subir audio', 500, 'storage_upload_failed');
    }

    const { data: publicData } = supabase.storage.from(audioBucket).getPublicUrl(storagePath);
    let audioUrl = publicData?.publicUrl ?? null;

    if (!audioUrl) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(audioBucket)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      if (signedError) {
        logger.error('Error al crear URL firmada:', signedError);
      } else {
        audioUrl = signedData?.signedUrl ?? null;
      }
    }

    if (!audioUrl) {
      await updateAudioStatus('error', {
        generationError: 'No se pudo generar URL de audio',
        generatedAt: nowIso(),
      });
      throw new AudioGenerationError('No se pudo generar URL de audio', 500, 'audio_url_failed');
    }

    const generatedAt = nowIso();
    await updateAudioStatus('ready', {
      storagePath,
      audioUrl,
      generatedAt,
      generationError: null,
    });

    return {
      id: pendingAudio.id,
      story_id: storyId,
      voice_id: effectiveVoiceId,
      status: 'ready',
      storage_path: storagePath,
      audio_url: audioUrl,
      generated_at: generatedAt,
    };
  } catch (error) {
    if (error instanceof AudioGenerationError) {
      throw error;
    }

    await updateAudioStatus('error', {
      generationError: error instanceof Error ? error.message : 'Error al generar audio',
      generatedAt: nowIso(),
    });
    throw new AudioGenerationError('Error al llamar a GenAIPro', 502, 'genaipro_unreachable');
  }
}
