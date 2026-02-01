import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para uso en rutas API con el token del usuario autenticado.
 * Usa la anon key (pÃºblica) y el Bearer token para aplicar RLS.
 */
export function createSupabaseServerClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_URL. Por favor, aÃ±ade esta variable en .env.local'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Por favor, aÃ±ade una de estas variables en .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
