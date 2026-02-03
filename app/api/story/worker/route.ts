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

export async function POST(request: NextRequest) {
  try {
    const workerSecret = process.env.STORY_WORKER_SECRET;
    if (!workerSecret) {
      return NextResponse.json(
        { error: 'STORY_WORKER_SECRET no configurado' },
        { status: 500 }
      );
    }

    const incomingSecret = parseWorkerAuth(request);
    if (!incomingSecret || incomingSecret !== workerSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let payload: { max_jobs?: number; story_id?: string } = {};
    try {
      payload = await request.json();
    } catch {
      // body opcional
    }

    const maxJobs = payload.max_jobs ?? 5;
    const onlyStoryId = payload.story_id?.trim();

    const result = await processStoryJobs({
      maxJobs,
      onlyStoryId: onlyStoryId || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error en /api/story/worker:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
