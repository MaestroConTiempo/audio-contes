import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const DEFAULT_AUDIO_BUCKET = 'audios';

const getAudioBucket = () =>
  process.env.ELEVENLABS_AUDIO_BUCKET || DEFAULT_AUDIO_BUCKET;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const resolvedParams = await params;
  const urlId = new URL(request.url).pathname.split('/').pop();
  const storyId = resolvedParams.storyId?.trim() || urlId?.trim();

  if (!storyId) {
    return NextResponse.json({ error: 'story_id requerido' }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const audioBucket = getAudioBucket();

    const { data: audioRows, error: audioFetchError } = await supabase
      .from('audios')
      .select('id, storage_path')
      .eq('story_id', storyId);

    if (audioFetchError) {
      console.error('Error al obtener audios:', audioFetchError);
      return NextResponse.json(
        { error: `Error al obtener audios: ${audioFetchError.message}` },
        { status: 500 }
      );
    }

    const storagePaths = (audioRows ?? [])
      .map((audio) => audio.storage_path)
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(audioBucket)
        .remove(storagePaths);
      if (storageError) {
        console.error('Error al borrar archivos de audio:', storageError);
      }
    }

    const { error: audioDeleteError } = await supabase
      .from('audios')
      .delete()
      .eq('story_id', storyId);

    if (audioDeleteError) {
      console.error('Error al borrar audios:', audioDeleteError);
      return NextResponse.json(
        { error: `Error al borrar audios: ${audioDeleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/story/audio/[storyId]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
