import { NextRequest, NextResponse } from 'next/server';
import { processStoryJobs } from '@/lib/storyJobs';

const parseWorkerAuth = (request: NextRequest) => {
  const byHeader = request.headers.get('x-worker-secret')?.trim();
  if (byHeader) return byHeader;

  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
};

const getWorkerSecret = () =>
  process.env.STORY_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;

const runWorker = async (params: { max_jobs?: number; story_id?: string }) => {
  const maxJobs = params.max_jobs ?? 5;
  const onlyStoryId = params.story_id?.trim();

  const result = await processStoryJobs({
    maxJobs,
    onlyStoryId: onlyStoryId || undefined,
  });

  return NextResponse.json({ success: true, ...result });
};

const authorizeWorker = (request: NextRequest) => {
  const workerSecret = getWorkerSecret();
  if (!workerSecret) {
    return NextResponse.json(
      { error: 'STORY_WORKER_SECRET o CRON_SECRET no configurado' },
      { status: 500 }
    );
  }

  const incomingSecret = parseWorkerAuth(request);
  if (!incomingSecret || incomingSecret !== workerSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return null;
};

export async function GET(request: NextRequest) {
  try {
    const authError = authorizeWorker(request);
    if (authError) return authError;

    const maxJobsParam = request.nextUrl.searchParams.get('max_jobs');
    const storyIdParam = request.nextUrl.searchParams.get('story_id');
    const maxJobs = maxJobsParam ? Number.parseInt(maxJobsParam, 10) : undefined;

    return runWorker({
      max_jobs: Number.isNaN(maxJobs ?? NaN) ? undefined : maxJobs,
      story_id: storyIdParam || undefined,
    });
  } catch (error) {
    console.error('Error en /api/story/worker:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = authorizeWorker(request);
    if (authError) return authError;

    let payload: { max_jobs?: number; story_id?: string } = {};
    try {
      payload = await request.json();
    } catch {
      // body opcional
    }

    return runWorker(payload);
  } catch (error) {
    console.error('Error en /api/story/worker:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
