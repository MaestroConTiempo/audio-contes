import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AudioGenerationError, generateAudioForStory } from '@/lib/audioGeneration';

const getAccessToken = (request: NextRequest) => {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token.trim();
};

export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  const supabase = createSupabaseServerClient(accessToken ?? undefined);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: 'No autorizado', code: 'unauthorized' },
      { status: 401 }
    );
  }

  let payload: { story_id?: string; voice_id?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const storyId = payload.story_id?.trim();
  const voiceId = payload.voice_id?.trim();

  if (!storyId) {
    return NextResponse.json({ error: 'story_id es requerido' }, { status: 400 });
  }

  try {
    const audio = await generateAudioForStory({
      supabase,
      storyId,
      userId: userData.user.id,
      voiceId,
    });

    return NextResponse.json({ success: true, audio });
  } catch (error) {
    if (error instanceof AudioGenerationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          detail: error.detail,
        },
        { status: error.status }
      );
    }

    console.error('Error en /api/story/audio:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido al generar audio';

    return NextResponse.json(
      { error: errorMessage, code: 'audio_generation_error' },
      { status: 500 }
    );
  }
}
