import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Anon key é público por design — seguro incluir no bundle.
// A service role key fica apenas no servidor (client.server.ts via process.env).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://irhrowdwlbantlauwthd.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaHJvd2R3bGJhbnRsYXV3dGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjI2NDMsImV4cCI6MjA5NTczODY0M30.qUCl7NxQj04dmgseJXJuVCpQduPpJm2LusxhAW3cpTA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
