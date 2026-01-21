import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ NO importar en componentes client ⚠️
 * 
 * Este cliente solo debe usarse en:
 * - Server Components
 * - API Routes (app/api/*)
 * - Server Actions
 * - Middleware
 * 
 * Usa la Service Role Key que tiene permisos completos de administración.
 * NUNCA exponer esta key en el cliente.
 * 
 * @returns Cliente de Supabase con permisos de administrador
 * @throws Error si faltan las variables de entorno requeridas
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing env.NEXT_PUBLIC_SUPABASE_URL. Por favor, añade esta variable en .env.local'
    );
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing env.SUPABASE_SERVICE_ROLE_KEY. Por favor, añade esta variable en .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
