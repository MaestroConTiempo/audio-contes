import { after, NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StoryState } from '@/lib/storyData';
import { getStoryTitle } from '@/lib/storyGeneration';
import { processStoryJobs } from '@/lib/storyJobs';

const DAILY_STORY_LIMIT_MESSAGE =
  'La magia de hoy ya se ha usado, ma\u00f1ana volver\u00e1 a estar lista para crear una nueva historia';

const getUtcDayBounds = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const getAccessToken = (request: NextRequest) => {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
};

export async function POST(request: NextRequest) {
  try {
    let body: { storyState?: StoryState };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    const storyState = body.storyState;
    if (!storyState || typeof storyState !== 'object') {
      return NextResponse.json({ error: 'storyState es requerido' }, { status: 400 });
    }

    const accessToken = getAccessToken(request);
    const supabase = createSupabaseServerClient(accessToken ?? undefined);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { startIso, endIso } = getUtcDayBounds();
    const { data: existingStoryToday, error: existingStoryError } = await supabase
      .from('stories')
      .select('id')
      .eq('user_id', userData.user.id)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingStoryError) {
      return NextResponse.json(
        { error: `No se pudo validar el l\u00edmite diario: ${existingStoryError.message}` },
        { status: 500 }
      );
    }

    if (existingStoryToday) {
      return NextResponse.json(
        {
          error: DAILY_STORY_LIMIT_MESSAGE,
          code: 'daily_story_limit_reached',
        },
        { status: 429 }
      );
    }

    const title = getStoryTitle(storyState);

    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: userData.user.id,
        title,
        inputs: storyState,
        story_text: '',
        status: 'pending',
        generation_error: null,
        generated_at: null,
      })
      .select('id,title,status,created_at')
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { error: `No se pudo crear el cuento pendiente: ${storyError?.message || 'error desconocido'}` },
        { status: 500 }
      );
    }

    const adminSupabase = createSupabaseAdminClient();
    const { error: jobError } = await adminSupabase.from('story_jobs').insert({
      story_id: story.id,
      user_id: userData.user.id,
      status: 'pending',
      attempts: 0,
      last_error: null,
    });

    if (jobError) {
      await supabase
        .from('stories')
        .update({
          status: 'error',
          generation_error: `No se pudo encolar job: ${jobError.message}`,
        })
        .eq('id', story.id);

      return NextResponse.json(
        { error: `No se pudo encolar el job: ${jobError.message}` },
        { status: 500 }
      );
    }

    // Ejecuta el worker despues de responder usando el hook oficial de Next.
    after(async () => {
      try {
        const result = await processStoryJobs({ maxJobs: 1, onlyStoryId: story.id });
        if (result.errors.length > 0) {
          console.error('[story/start] Worker auto-trigger con errores:', result.errors);
        }
      } catch (error) {
        console.error('[story/start] Worker auto-trigger fallo:', error);
      }
    });

    return NextResponse.json({
      success: true,
      story_id: story.id,
      status: story.status,
      story: {
        id: story.id,
        title: story.title,
        created_at: story.created_at,
        status: story.status,
      },
    });
  } catch (error) {
    console.error('Error en /api/story/start:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
