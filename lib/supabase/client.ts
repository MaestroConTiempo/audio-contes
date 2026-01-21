import { createClient } from '@supabase/supabase-js';

/**
 * Crea un cliente de Supabase para uso en el navegador (client components).
 * Usa las variables de entorno públicas NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * 
 * @returns Cliente de Supabase configurado para el navegador
 * @throws Error si faltan las variables de entorno requeridas
 */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_URL. Por favor, añade esta variable en .env.local'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Por favor, añade esta variable en .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
