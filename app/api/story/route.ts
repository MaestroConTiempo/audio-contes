import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { StoryState } from '@/lib/storyData';

/**
 * Formatea el storyState en un mensaje legible para el assistant
 */
function formatStoryStateToMessage(storyState: StoryState): string {
  const fieldLabels: Record<string, string> = {
    hero: 'Héroe',
    sidekick: 'Personaje secundario',
    object: 'Objeto',
    place: 'Lugar',
    moral: 'Moral',
    narrator: 'Narrador',
  };

  const parts: string[] = ['Genera un cuento infantil con estos elementos:'];
  
  // Orden de campos para el mensaje
  const fieldOrder = ['hero', 'sidekick', 'object', 'place', 'moral', 'narrator'];
  
  for (const fieldId of fieldOrder) {
    const selection = storyState[fieldId];
    if (selection?.optionId && selection?.optionName) {
      const label = fieldLabels[fieldId] || fieldId;
      let text = `- ${label}: ${selection.optionName}`;
      
      // Si tiene nombre personalizado, añadirlo
      if (selection.customName) {
        text += ` (nombre: ${selection.customName})`;
      }
      
      parts.push(text);
    }
  }
  
  return parts.join('\n');
}

function getStoryTitle(storyState: StoryState): string {
  const hero = storyState.hero;
  if (hero?.customName) {
    return `Cuento de ${hero.customName}`;
  }
  if (hero?.optionName) {
    return `Cuento de ${hero.optionName}`;
  }
  return 'Cuento infantil';
}

/**
 * Endpoint POST /api/story
 * Genera un cuento usando OpenAI Assistants y lo guarda en Supabase
 */
export async function POST(request: NextRequest) {
  try {
    // Validar variables de entorno de OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (!openaiApiKey || openaiApiKey.trim() === '') {
      return NextResponse.json(
        { 
          error: 'OPENAI_API_KEY no configurada en .env.local',
          details: 'Por favor, añade tu API key de OpenAI en el archivo .env.local. Puedes obtenerla en https://platform.openai.com/api-keys'
        },
        { status: 500 }
      );
    }

    if (!assistantId || assistantId.trim() === '') {
      return NextResponse.json(
        { 
          error: 'OPENAI_ASSISTANT_ID no configurada en .env.local',
          details: 'Por favor, añade el ID de tu Assistant de OpenAI en el archivo .env.local. Puedes crearlo en https://platform.openai.com/assistants'
        },
        { status: 500 }
      );
    }

    // Obtener storyState del body
    const body = await request.json();
    const storyState: StoryState = body.storyState;
    const userId: string | null = body.userId ?? null;

    if (!storyState) {
      return NextResponse.json(
        { error: 'storyState es requerido' },
        { status: 400 }
      );
    }

    // Inicializar cliente de OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Formatear mensaje para el assistant
    const userMessage = formatStoryStateToMessage(storyState);

    // 1. Crear un thread nuevo
    const thread = await openai.beta.threads.create();
    if (!thread?.id) {
      console.error('OpenAI no devolvió thread.id:', thread);
      return NextResponse.json(
        { error: 'OpenAI no devolvió un ID de thread válido' },
        { status: 500 }
      );
    }

    // 2. Enviar el mensaje del usuario
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage,
    });

    // 3. Ejecutar el run con el assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });
    if (!run?.id) {
      console.error('OpenAI no devolvió run.id:', run);
      return NextResponse.json(
        { error: 'OpenAI no devolvió un ID de run válido' },
        { status: 500 }
      );
    }

    // 4. Hacer polling hasta que el run esté completed
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: thread.id,
    });
    const maxAttempts = 60; // Máximo 60 intentos (5 minutos si cada uno tarda 5 segundos)
    let attempts = 0;

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      if (runStatus.status === 'failed') {
        return NextResponse.json(
          { error: `El run falló: ${runStatus.last_error?.message || 'Error desconocido'}` },
          { status: 500 }
        );
      }

      if (runStatus.status === 'cancelled') {
        return NextResponse.json(
          { error: 'El run fue cancelado' },
          { status: 500 }
        );
      }

      // Esperar 2 segundos antes de verificar de nuevo
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      return NextResponse.json(
        { error: `Timeout: el run no se completó después de ${maxAttempts} intentos` },
        { status: 500 }
      );
    }

    // 5. Obtener mensajes del thread
    const messages = await openai.beta.threads.messages.list(thread.id, {
      order: 'desc',
      limit: 1,
    });

    // Extraer el texto final del asistente
    const assistantMessage = messages.data[0];
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      return NextResponse.json(
        { error: 'No se pudo obtener el mensaje del asistente' },
        { status: 500 }
      );
    }

    // El contenido puede ser un array, extraer el texto
    const content = assistantMessage.content[0];
    if (!content) {
      return NextResponse.json(
        { error: 'El mensaje del asistente llegó vacío' },
        { status: 500 }
      );
    }
    let storyText = '';
    
    if (content.type === 'text') {
      storyText = content.text.value;
    } else {
      return NextResponse.json(
        { error: 'El contenido del mensaje no es texto' },
        { status: 500 }
      );
    }

    // 6. Guardar el cuento en Supabase
    const supabase = createSupabaseAdminClient();
    const insertPayload: {
      user_id?: string;
      title: string;
      inputs: StoryState;
      story_text: string;
      status: string;
    } = {
      title: getStoryTitle(storyState),
      inputs: storyState,
      story_text: storyText,
      status: 'generated',
    };

    if (userId) {
      insertPayload.user_id = userId;
    }

    const { data: insertedStory, error: supabaseError } = await supabase
      .from('stories')
      .insert(insertPayload)
      .select()
      .single();

    if (supabaseError) {
      console.error('Error al guardar en Supabase:', supabaseError);
      return NextResponse.json(
        { error: `Error al guardar en Supabase: ${supabaseError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      story: {
        id: insertedStory.id,
        story_text: storyText,
        inputs: storyState,
        title: insertedStory.title,
        status: insertedStory.status,
        created_at: insertedStory.created_at ?? null,
      },
    });
  } catch (error) {
    console.error('Error en /api/story:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
