import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_AUDIO_BUCKET = 'audios';
const DEFAULT_MAX_CHARS = 4000;
const DEFAULT_TIMEOUT_MS = 60000;

type AudioStatus = 'pending' | 'ready' | 'error';

const parseNumberEnv = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const buildAudioErrorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

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
    voiceIdInput || process.env.ELEVENLABS_VOICE_ID?.trim();

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
    return buildAudioErrorResponse('ELEVENLABS_VOICE_ID no configurado', 500);
  }

  const maxChars = parseNumberEnv(process.env.ELEVENLABS_MAX_CHARS, DEFAULT_MAX_CHARS);
  if (story.story_text.length > maxChars) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('El cuento supera el limite de caracteres para audio', 400);
  }

  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsApiKey) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('ELEVENLABS_API_KEY no configurado', 500);
  }

  const controller = new AbortController();
  const timeoutMs = parseNumberEnv(process.env.ELEVENLABS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let audioBuffer: ArrayBuffer;
  try {
    const response = await fetch(`${ELEVENLABS_API_BASE}/${effectiveVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: story.story_text,
        model_id: process.env.ELEVENLABS_MODEL_ID || undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error ElevenLabs:', response.status, errorText);
      await updateAudioStatus('error');
      return buildAudioErrorResponse('Error al generar audio', 502);
    }

    audioBuffer = await response.arrayBuffer();
  } catch (error) {
    console.error('Error al llamar a ElevenLabs:', error);
    await updateAudioStatus('error');
    return buildAudioErrorResponse('Error al llamar a ElevenLabs', 502);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!audioBuffer || audioBuffer.byteLength === 0) {
    await updateAudioStatus('error');
    return buildAudioErrorResponse('Audio vacio', 502);
  }

  const audioBucket = process.env.ELEVENLABS_AUDIO_BUCKET || DEFAULT_AUDIO_BUCKET;
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
