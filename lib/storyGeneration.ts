import OpenAI from 'openai';
import { StoryState } from '@/lib/storyData';

const fieldLabels: Record<string, string> = {
  hero: 'Heroe',
  sidekick: 'Personaje secundario',
  object: 'Objeto',
  place: 'Lugar',
  moral: 'Que pasara',
  language: 'Idioma',
};

export function formatStoryStateToMessage(storyState: StoryState): string {
  const parts: string[] = ['Genera un cuento infantil con estos elementos:'];
  const fieldOrder = ['hero', 'sidekick', 'object', 'place', 'moral', 'language'];

  for (const fieldId of fieldOrder) {
    const selection = storyState[fieldId];
    if (selection?.optionId && selection?.optionName) {
      const label = fieldLabels[fieldId] || fieldId;
      let text = `- ${label}: ${selection.optionName}`;
      if (selection.customName) {
        text += ` (nombre: ${selection.customName})`;
      }
      parts.push(text);
    } else if (fieldId === 'moral' && selection?.freeText) {
      const label = fieldLabels[fieldId] || fieldId;
      parts.push(`- ${label}: ${selection.freeText}`);
    }
  }

  const selectedLanguage = storyState.language?.optionName;
  if (selectedLanguage) {
    parts.push(`Redacta el cuento en ${selectedLanguage}.`);
    parts.push('No uses ningún otro idioma distinto al indicado.');
  }

  return parts.join('\n');
}

export function getStoryTitle(storyState: StoryState): string {
  const hero = storyState.hero;
  if (hero?.customName) {
    return `Cuento de ${hero.customName}`;
  }
  if (hero?.optionName) {
    return `Cuento de ${hero.optionName}`;
  }
  return 'Cuento infantil';
}

export type GeneratedStory = {
  title: string;
  storyText: string;
};

export async function generateStoryWithOpenAI(storyState: StoryState): Promise<GeneratedStory> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!openaiApiKey || openaiApiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY no configurada');
  }
  if (!assistantId || assistantId.trim() === '') {
    throw new Error('OPENAI_ASSISTANT_ID no configurada');
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const userMessage = formatStoryStateToMessage(storyState);

  const thread = await openai.beta.threads.create();
  if (!thread?.id) {
    throw new Error('OpenAI no devolvio thread.id');
  }

  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: userMessage,
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  if (!run?.id) {
    throw new Error('OpenAI no devolvio run.id');
  }

  let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
    thread_id: thread.id,
  });

  const maxAttempts = 120;
  let attempts = 0;

  while (runStatus.status !== 'completed' && attempts < maxAttempts) {
    if (runStatus.status === 'failed') {
      throw new Error(runStatus.last_error?.message || 'El run fallo');
    }
    if (runStatus.status === 'cancelled') {
      throw new Error('El run fue cancelado');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });
    attempts += 1;
  }

  if (runStatus.status !== 'completed') {
    throw new Error('Timeout: el run no se completo a tiempo');
  }

  const messages = await openai.beta.threads.messages.list(thread.id, {
    order: 'desc',
    limit: 1,
  });

  const assistantMessage = messages.data[0];
  if (!assistantMessage || assistantMessage.role !== 'assistant') {
    throw new Error('No se pudo obtener el mensaje del asistente');
  }

  const textChunks = assistantMessage.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text.value)
    .filter((value) => value && value.trim() !== '');

  if (textChunks.length === 0) {
    throw new Error('El mensaje del asistente llego vacio');
  }

  const normalized = textChunks.join('\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const withoutLeadingBlankLines = normalized.replace(/^\s*\n+/, '');
  const lines = withoutLeadingBlankLines.split('\n');
  const titleLine = (lines[0] ?? '').trim();
  let rest = lines.slice(1).join('\n');
  rest = rest.replace(/^\s*\n/, '').trim();

  if (!titleLine || !rest) {
    throw new Error('El assistant no devolvio titulo y cuento en el formato esperado');
  }

  const titleTooLong = titleLine.length > 120 || titleLine.split(/\s+/).length > 12;
  const title = titleTooLong ? getStoryTitle(storyState) : titleLine;
  const storyText = titleTooLong ? `${titleLine}\n${rest}`.trim() : rest;

  return { title, storyText };
}
