import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// URL é pública — fallback hardcoded é seguro.
// Service role key NUNCA deve vazar pro browser — fica apenas em process.env.
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://irhrowdwlbantlauwthd.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY não definido. " +
      "Adicione no .env local e nas variáveis de ambiente do servidor (Vercel/Supabase)."
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
