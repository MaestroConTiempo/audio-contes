import { createClient } from '@supabase/supabase-js';

/**
 * Crea un cliente de Supabase para uso en el navegador (client components).
 * Usa las variables de entorno públicas NEXT_PUBLIC_SUPABASE_URL y la key pública.
 * Soporta tanto NEXT_PUBLIC_SUPABASE_ANON_KEY (recomendado) como NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (legacy).
 * 
 * @returns Cliente de Supabase configurado para el navegador
 * @throws Error si faltan las variables de entorno requeridas
 */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublicKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_URL. Por favor, añade esta variable en .env.local'
    );
  }

  if (!supabasePublicKey) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Por favor, añade una de estas variables en .env.local'
    );
  }

  return createClient(supabaseUrl, supabasePublicKey);
}
