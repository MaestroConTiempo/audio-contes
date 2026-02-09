import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AudioRecord = {
  story_id: string;
  voice_id?: string | null;
  status?: string | null;
  audio_url?: string | null;
  created_at?: string | null;
};

const getAudioPriority = (audio: AudioRecord) => {
  if (audio.status === 'ready' && audio.audio_url) return 0;
  if (audio.status === 'pending') return 1;
  if (audio.status === 'error') return 2;
  return 3;
};

const getTimestamp = (value?: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const shouldReplaceAudio = (current: AudioRecord, candidate: AudioRecord) => {
  const currentPriority = getAudioPriority(current);
  const candidatePriority = getAudioPriority(candidate);

  if (candidatePriority !== currentPriority) {
    return candidatePriority < currentPriority;
  }

  return getTimestamp(candidate.created_at) > getTimestamp(current.created_at);
};

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

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = createSupabaseServerClient(accessToken ?? undefined);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('stories')
      .select('id,title,story_text,created_at,status,inputs,generation_error,generated_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar cuentos en Supabase:', error);
      return NextResponse.json(
        { error: `Error al cargar cuentos: ${error.message}` },
        { status: 500 }
      );
    }

    const stories = data ?? [];
    const storyIds = stories.map((story) => story.id);

    if (storyIds.length === 0) {
      return NextResponse.json({ stories });
    }

    const { data: audioData, error: audioError } = await supabase
      .from('audios')
      .select('story_id,voice_id,status,audio_url,created_at')
      .in('story_id', storyIds)
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (audioError) {
      console.error('Error al cargar audios en Supabase:', audioError);
      return NextResponse.json(
        { error: `Error al cargar audios: ${audioError.message}` },
        { status: 500 }
      );
    }

    const audioByStory = new Map<string, AudioRecord>();
    for (const audio of audioData ?? []) {
      const existing = audioByStory.get(audio.story_id);
      if (!existing || shouldReplaceAudio(existing, audio)) {
        audioByStory.set(audio.story_id, audio);
      }
    }

    const storiesWithAudio = stories.map((story) => {
      const audio = audioByStory.get(story.id);
      return {
        ...story,
        audio: audio
          ? {
              audio_url: audio.audio_url ?? null,
              status: audio.status ?? null,
              voice_id: audio.voice_id ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({ stories: storiesWithAudio });
  } catch (error) {
    console.error('Error en /api/stories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
