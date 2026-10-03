import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('[QuestLife Supabase] Initialization error:', err);
    client = null;
  }
} else {
  // If not configured in environment variables, warn in console
  console.info(
    '[QuestLife Supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY are not configured. The app runs in local-first mode. Configure your Supabase project in AI Studio environment variables to enable cloud authentication and real-time synchronization.'
  );
}

export function getSupabase(): SupabaseClient | null {
  return client;
}

export { client as supabase };
