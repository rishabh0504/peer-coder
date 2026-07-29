import { loadEnv } from "@config/env.js";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseInstance(): SupabaseClient {
  if (!supabaseInstance) {
    const env = loadEnv();
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase credentials are not configured. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in your environment.",
      );
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

export const supabaseClient = {
  get instance() {
    return getSupabaseInstance();
  },
};
