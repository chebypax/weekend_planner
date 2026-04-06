import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "./config";

export function getSupabaseServerClient(): SupabaseClient | null {
  const env = getSupabaseBrowserEnv();

  if (!env) {
    return null;
  }

  return createClient(env.url, env.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
