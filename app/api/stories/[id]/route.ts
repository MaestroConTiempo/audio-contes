import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const DEFAULT_AUDIO_BUCKET = 'audios';

const getAudioBucket = () =>
  process.env.ELEVENLABS_AUDIO_BUCKET || DEFAULT_AUDIO_BUCKET;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const urlId = new URL(request.url).pathname.split('/').pop();
  const storyId = resolvedParams.id?.trim() || urlId?.trim();

  if (!storyId) {
    return NextResponse.json({ error: 'ID de cuento requerido' }, { status: 400 });
  }

  try {
    const authHeader =
      request.headers.get('authorization') || request.headers.get('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    const supabase = createSupabaseServerClient(accessToken ?? undefined);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const audioBucket = getAudioBucket();

    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('id')
      .eq('id', storyId)
      .eq('user_id', userData.user.id)
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Cuento no encontrado' }, { status: 404 });
    }

    const { data: audioRows, error: audioFetchError } = await supabase
      .from('audios')
      .select('id, storage_path')
      .eq('story_id', storyId)
      .eq('user_id', userData.user.id);

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
      .eq('story_id', storyId)
      .eq('user_id', userData.user.id);

    if (audioDeleteError) {
      console.error('Error al borrar audios:', audioDeleteError);
      return NextResponse.json(
        { error: `Error al borrar audios: ${audioDeleteError.message}` },
        { status: 500 }
      );
    }

    const { error: storyDeleteError } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', userData.user.id);

    if (storyDeleteError) {
      console.error('Error al borrar cuento:', storyDeleteError);
      return NextResponse.json(
        { error: `Error al borrar cuento: ${storyDeleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en DELETE /api/stories/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
