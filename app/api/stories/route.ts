import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AudioRecord = {
  story_id: string;
  voice_id?: string | null;
  status?: string | null;
  audio_url?: string | null;
  created_at?: string | null;
};

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('stories')
      .select('id,title,story_text,created_at,status,inputs')
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
      if (!audioByStory.has(audio.story_id)) {
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
