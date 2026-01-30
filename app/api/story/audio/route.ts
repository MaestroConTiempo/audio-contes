import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const GENAIPRO_API_BASE = 'https://genaipro.vn/api/v1';
const DEFAULT_AUDIO_BUCKET = 'audios';
const DEFAULT_MAX_CHARS = 4000;
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_POLL_INTERVAL_MS = 1500;

type AudioStatus = 'pending' | 'ready' | 'error';

const parseNumberEnv = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseFloatEnv = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseBooleanEnv = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
};

const buildAudioErrorResponse = (
  message: string,
  status = 500,
  code?: string,
  detail?: string
) =>
  NextResponse.json(
    {
      error: message,
      code,
      detail,
    },
    { status }
  );

const classifyElevenLabsError = (errorText: string) => {
  const lower = errorText.toLowerCase();
  if (lower.includes('quota') || lower.includes('credit') || lower.includes('subscription')) {
    return { code: 'credits_or_quota', message: 'Créditos insuficientes en ElevenLabs' };
  }
  if (lower.includes('character') || lower.includes('characters')) {
    return { code: 'provider_char_limit', message: 'Límite de caracteres de ElevenLabs' };
  }
  return { code: 'elevenlabs_error', message: 'Error al generar audio' };
};

const classifyGenaiproError = (errorText: string) => {
  const lower = errorText.toLowerCase();
  if (lower.includes('quota') || lower.includes('credit') || lower.includes('balance')) {
    return { code: 'credits_or_quota', message: 'CrÃ©ditos insuficientes en GenAIPro' };
  }
  if (lower.includes('character') || lower.includes('characters') || lower.includes('length')) {
    return { code: 'provider_char_limit', message: 'LÃ­mite de caracteres de GenAIPro' };
  }
  if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('token')) {
    return { code: 'auth_error', message: 'Token invÃ¡lido o no autorizado en GenAIPro' };
  }
  return { code: 'genaipro_error', message: 'Error al generar audio' };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdminClient();

  let payload: { story_id?: string; voice_id?: string };
  try {
    payload = await request.json();
  } catch {
    return buildAudioErrorResponse('Body invalido', 400);
  }

  const storyId = payload.story_id?.trim();
  const voiceIdInput = payload.voice_id?.trim();

  if (!storyId) {
    return buildAudioErrorResponse('story_id es requerido', 400);
  }

  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('id, story_text')
    .eq('id', storyId)
    .single();

  if (storyError || !story?.story_text) {
    console.error('No se encontro el cuento:', storyError);
    return buildAudioErrorResponse('No se encontro el cuento', 404);
  }

  const effectiveVoiceId =
    voiceIdInput || process.env.GENAIPRO_VOICE_ID?.trim();

  const { data: pendingAudio, error: pendingError } = await supabase
    .from('audios')
    .insert({
      story_id: storyId,
      voice_id: effectiveVoiceId ?? null,
      status: 'pending' as AudioStatus,
      storage_path: null,
      audio_url: null,
      user_id: null,
    })
    .select()
    .single();

  if (pendingError || !pendingAudio) {
    console.error('Error al insertar audio pendiente:', pendingError);
    return buildAudioErrorResponse(
      `No se pudo crear el audio pendiente${pendingError?.message ? `: ${pendingError.message}` : ''}`,
      500
    );
  }

  const updateAudioStatus = async (status: AudioStatus, storagePath?: string | null, audioUrl?: string | null) => {
    const { error } = await supabase
      .from('audios')
      .update({
        status,
        storage_path: storagePath ?? null,
        audio_url: audioUrl ?? null,
      })
      .eq('id', pendingAudio.id);
    if (error) {
      console.error('Error al actualizar audio:', error);
    }
  };

  if (!effectiveVoiceId) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('GENAIPRO_VOICE_ID no configurado', 500, 'config_missing');
  }

  const maxChars = parseNumberEnv(process.env.GENAIPRO_MAX_CHARS, DEFAULT_MAX_CHARS);
  if (story.story_text.length > maxChars) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse(
      'El cuento supera el límite de caracteres para audio',
      400,
      'max_chars',
      `Longitud: ${story.story_text.length}. Máximo: ${maxChars}.`
    );
  }

  const genaiproApiKey = process.env.GENAIPRO_API_KEY;
  if (!genaiproApiKey) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('GENAIPRO_API_KEY no configurado', 500, 'config_missing');
  }

  const controller = new AbortController();
  const timeoutMs = parseNumberEnv(process.env.GENAIPRO_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const pollIntervalMs = parseNumberEnv(process.env.GENAIPRO_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);

  const modelId = process.env.GENAIPRO_MODEL_ID?.trim() || 'eleven_multilingual_v2';
  const style = parseFloatEnv(process.env.GENAIPRO_STYLE);
  const speed = parseFloatEnv(process.env.GENAIPRO_SPEED);
  const similarity = parseFloatEnv(process.env.GENAIPRO_SIMILARITY);
  const stability = parseFloatEnv(process.env.GENAIPRO_STABILITY);
  const useSpeakerBoost = parseBooleanEnv(process.env.GENAIPRO_USE_SPEAKER_BOOST);

  let audioBuffer: ArrayBuffer;
  try {
    const taskPayload: Record<string, unknown> = {
      input: story.story_text,
      voice_id: effectiveVoiceId,
      model_id: modelId,
    };

    if (style !== undefined) {
      taskPayload.style = style;
    }
    if (speed !== undefined) {
      taskPayload.speed = speed;
    }
    if (similarity !== undefined) {
      taskPayload.similarity = similarity;
    }
    if (stability !== undefined) {
      taskPayload.stability = stability;
    }
    if (useSpeakerBoost !== undefined) {
      taskPayload.use_speaker_boost = useSpeakerBoost;
    }

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
      console.error('Error GenAIPro (crear tarea):', createResponse.status, errorText);
      await updateAudioStatus('error');
      const classified = classifyGenaiproError(errorText);
      return buildAudioErrorResponse(
        classified.message,
        502,
        classified.code,
        errorText.slice(0, 500)
      );
    }

    const createData = await createResponse.json().catch(() => null);
    const taskId = createData?.task_id as string | undefined;

    if (!taskId) {
      await updateAudioStatus('error');
      return buildAudioErrorResponse('GenAIPro no devolviÃ³ task_id', 502, 'provider_bad_response');
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
        console.error('Error GenAIPro (estado tarea):', statusResponse.status, errorText);
        await updateAudioStatus('error');
        const classified = classifyGenaiproError(errorText);
        return buildAudioErrorResponse(
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
        const errorDetail =
          typeof statusData?.error === 'string' ? statusData.error : 'Error en la tarea de GenAIPro';
        await updateAudioStatus('error');
        return buildAudioErrorResponse(errorDetail, 502, 'provider_task_error');
      }

      await sleep(pollIntervalMs);
    }

    if (!resultUrl) {
      await updateAudioStatus('error');
      return buildAudioErrorResponse('Tiempo de espera agotado en GenAIPro', 504, 'provider_timeout');
    }

    const audioResponse = await fetch(resultUrl);
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error('Error GenAIPro (descarga audio):', audioResponse.status, errorText);
      await updateAudioStatus('error');
      return buildAudioErrorResponse('No se pudo descargar el audio', 502, 'provider_audio_download', errorText.slice(0, 500));
    }

    audioBuffer = await audioResponse.arrayBuffer();
  } catch (error) {
    console.error('Error al llamar a GenAIPro:', error);
    await updateAudioStatus('error');
    return buildAudioErrorResponse('Error al llamar a GenAIPro', 502, 'genaipro_unreachable');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!audioBuffer || audioBuffer.byteLength === 0) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('Audio vacio', 502);
  }

  const audioBucket =
    process.env.GENAIPRO_AUDIO_BUCKET ||
    process.env.ELEVENLABS_AUDIO_BUCKET ||
    DEFAULT_AUDIO_BUCKET;
  const storagePath = `stories/${storyId}/${pendingAudio.id}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from(audioBucket)
    .upload(storagePath, Buffer.from(audioBuffer), {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error al subir audio:', uploadError);
    await updateAudioStatus('error');
    return buildAudioErrorResponse('Error al subir audio', 500);
  }

  const { data: publicData } = supabase.storage
    .from(audioBucket)
    .getPublicUrl(storagePath);

  let audioUrl = publicData?.publicUrl ?? null;

  if (!audioUrl) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(audioBucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (signedError) {
      console.error('Error al crear URL firmada:', signedError);
    } else {
      audioUrl = signedData?.signedUrl ?? null;
    }
  }

  if (!audioUrl) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('No se pudo generar URL de audio', 500);
  }

  await updateAudioStatus('ready', storagePath, audioUrl);

  return NextResponse.json({
    success: true,
    audio: {
      id: pendingAudio.id,
      story_id: storyId,
      voice_id: effectiveVoiceId,
      status: 'ready',
      storage_path: storagePath,
      audio_url: audioUrl,
    },
  });
}
