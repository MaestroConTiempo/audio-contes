import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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

    return NextResponse.json({ stories: data ?? [] });
  } catch (error) {
    console.error('Error en /api/stories:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
