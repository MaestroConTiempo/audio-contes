import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { processStoryJobs } from '@/lib/storyJobs';

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
  try {
    const accessToken = getAccessToken(request);
    const supabase = createSupabaseServerClient(accessToken ?? undefined);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminSupabase = createSupabaseAdminClient();

    const { data: pendingJob, error: pendingJobError } = await adminSupabase
      .from('story_jobs')
      .select('id,story_id,status')
      .eq('user_id', userData.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; story_id: string; status: string }>();

    if (pendingJobError) {
      return NextResponse.json(
        { error: `No se pudo buscar job pendiente: ${pendingJobError.message}` },
        { status: 500 }
      );
    }

    let candidateStoryId = pendingJob?.story_id ?? null;

    if (!candidateStoryId) {
      const { data: processingJob, error: processingJobError } = await adminSupabase
        .from('story_jobs')
        .select('id,story_id,status')
        .eq('user_id', userData.user.id)
        .eq('status', 'processing')
        .order('updated_at', { ascending: true })
        .limit(1)
        .maybeSingle<{ id: string; story_id: string; status: string }>();

      if (processingJobError) {
        return NextResponse.json(
          { error: `No se pudo buscar job processing: ${processingJobError.message}` },
          { status: 500 }
        );
      }

      candidateStoryId = processingJob?.story_id ?? null;
    }

    if (!candidateStoryId) {
      return NextResponse.json({
        success: true,
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        reason: 'no_pending_jobs_for_user',
      });
    }

    const result = await processStoryJobs({
      maxJobs: 1,
      onlyStoryId: candidateStoryId,
    });

    return NextResponse.json({
      success: true,
      candidate_story_id: candidateStoryId,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/story/progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
