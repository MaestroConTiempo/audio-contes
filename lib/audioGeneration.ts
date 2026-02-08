import type { SupabaseClient } from '@supabase/supabase-js';

const GENAIPRO_API_BASE = 'https://genaipro.vn/api/v1';
const DEFAULT_AUDIO_BUCKET = 'audios';
const DEFAULT_MAX_CHARS = 10000;
const DEFAULT_TIMEOUT_MS = 900000;
const DEFAULT_POLL_INTERVAL_MS = 2000;

export type AudioStatus = 'pending' | 'ready' | 'error';

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

const parseBooleanEnv = (value: string | undefined) => {
  if (!value) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
};

const classifyGenaiproError = (errorText: string) => {
  const lower = errorText.toLowerCase();
  if (lower.includes('quota') || lower.includes('credit') || lower.includes('balance')) {
    return { code: 'credits_or_quota', message: 'Créditos insuficientes en GenAIPro' };
  }
  if (lower.includes('character') || lower.includes('characters') || lower.includes('length')) {
    return { code: 'provider_char_limit', message: 'Límite de caracteres de GenAIPro' };
  }
  if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('token')) {
    return { code: 'auth_error', message: 'Token inválido o no autorizado en GenAIPro' };
  }
  return { code: 'genaipro_error', message: 'Error al generar audio' };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();

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
  generated_at?: string | null;
  generation_error?: string | null;
};

export async function generateAudioForStory({
  supabase,
  storyId,
  userId,
  voiceId,
  logger = console,
}: GenerateAudioArgs) {
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

  const { data: pendingAudio, error: pendingError } = await supabase
    .from('audios')
    .insert({
      story_id: storyId,
      voice_id: effectiveVoiceId || null,
      status: 'pending' as AudioStatus,
      storage_path: null,
      audio_url: null,
      generated_at: null,
      generation_error: null,
      user_id: userId,
    })
    .select('id,story_id,voice_id,status,storage_path,audio_url,generated_at,generation_error')
    .single<AudioRow>();

  if (pendingError || !pendingAudio) {
    logger.error('Error al insertar audio pendiente:', pendingError);
    throw new AudioGenerationError(
      `No se pudo crear el audio pendiente${pendingError?.message ? `: ${pendingError.message}` : ''}`,
      500,
      'audio_insert_failed'
    );
  }

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

  if (!effectiveVoiceId) {
    const message = 'voice_id es requerido';
    await updateAudioStatus('error', { generationError: message });
    throw new AudioGenerationError(message, 400, 'voice_required');
  }

  const titleLine = story.title ? `Titulo: ${story.title}\n\n` : '';
  const audioText = `${titleLine}${story.story_text}`;
  const maxChars = parseNumberEnv(process.env.GENAIPRO_MAX_CHARS, DEFAULT_MAX_CHARS);

  if (audioText.length > maxChars) {
    const message = 'El cuento supera el limite de caracteres para audio';
    const detail = `Longitud: ${audioText.length}. Maximo: ${maxChars}.`;
    await updateAudioStatus('error', { generationError: `${message}. ${detail}` });
    throw new AudioGenerationError(message, 400, 'max_chars', detail);
  }

  const genaiproApiKey = process.env.GENAIPRO_API_KEY;
  if (!genaiproApiKey) {
    const message = 'GENAIPRO_API_KEY no configurado';
    await updateAudioStatus('error', { generationError: message });
    throw new AudioGenerationError(message, 500, 'config_missing');
  }

  const controller = new AbortController();
  const timeoutMs = parseNumberEnv(process.env.GENAIPRO_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const pollIntervalMs = parseNumberEnv(process.env.GENAIPRO_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);

  const modelId = 'eleven_turbo_v2_5';
  const style = parseFloatEnv(process.env.GENAIPRO_STYLE);
  const speed = parseFloatEnv(process.env.GENAIPRO_SPEED);
  const similarity = parseFloatEnv(process.env.GENAIPRO_SIMILARITY);
  const stability = parseFloatEnv(process.env.GENAIPRO_STABILITY);
  const useSpeakerBoost = parseBooleanEnv(process.env.GENAIPRO_USE_SPEAKER_BOOST);

  let audioBuffer: ArrayBuffer;
  try {
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
      signal: controller.signal,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      const classified = classifyGenaiproError(errorText);
      await updateAudioStatus('error', { generationError: errorText.slice(0, 500) });
      throw new AudioGenerationError(
        classified.message,
        502,
        classified.code,
        errorText.slice(0, 500)
      );
    }

    const createData = await createResponse.json().catch(() => null);
    const taskId = createData?.task_id as string | undefined;
    if (!taskId) {
      await updateAudioStatus('error', { generationError: 'GenAIPro no devolvio task_id' });
      throw new AudioGenerationError('GenAIPro no devolvio task_id', 502, 'provider_bad_response');
    }

    const deadline = Date.now() + timeoutMs;
    let resultUrl: string | null = null;

    while (Date.now() < deadline) {
      const statusResponse = await fetch(`${GENAIPRO_API_BASE}/labs/task/${taskId}`, {
        headers: {
          Authorization: `Bearer ${genaiproApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        const classified = classifyGenaiproError(errorText);
        await updateAudioStatus('error', { generationError: errorText.slice(0, 500) });
        throw new AudioGenerationError(
          classified.message,
          502,
          classified.code,
          errorText.slice(0, 500)
        );
      }

      const statusData = await statusResponse.json().catch(() => null);
      const status = statusData?.status as string | undefined;

      if (status === 'completed') {
        resultUrl = (statusData?.result as string | undefined) ?? null;
        break;
      }

      if (status === 'error') {
        const detail =
          typeof statusData?.error === 'string'
            ? statusData.error
            : 'Error en la tarea de GenAIPro';
        await updateAudioStatus('error', { generationError: detail });
        throw new AudioGenerationError(detail, 502, 'provider_task_error');
      }

      await sleep(pollIntervalMs);
    }

    if (!resultUrl) {
      const message = 'Tiempo de espera agotado en GenAIPro';
      await updateAudioStatus('error', { generationError: message });
      throw new AudioGenerationError(message, 504, 'provider_timeout');
    }

    const audioResponse = await fetch(resultUrl);
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      await updateAudioStatus('error', { generationError: errorText.slice(0, 500) });
      throw new AudioGenerationError(
        'No se pudo descargar el audio',
        502,
        'provider_audio_download',
        errorText.slice(0, 500)
      );
    }

    audioBuffer = await audioResponse.arrayBuffer();
  } catch (error) {
    if (error instanceof AudioGenerationError) {
      throw error;
    }
    await updateAudioStatus('error', {
      generationError: error instanceof Error ? error.message : 'Error al generar audio',
    });
    throw new AudioGenerationError('Error al llamar a GenAIPro', 502, 'genaipro_unreachable');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!audioBuffer || audioBuffer.byteLength === 0) {
    const message = 'Audio vacio';
    await updateAudioStatus('error', { generationError: message });
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
    await updateAudioStatus('error', { generationError: uploadError.message });
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
    await updateAudioStatus('error', { generationError: 'No se pudo generar URL de audio' });
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
    status: 'ready' as const,
    storage_path: storagePath,
    audio_url: audioUrl,
    generated_at: generatedAt,
  };
}
