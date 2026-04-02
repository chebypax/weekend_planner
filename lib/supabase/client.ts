"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserEnv } from "./config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const env = getSupabaseBrowserEnv();

  if (!env) {
    return null;
  }

  browserClient ??= createBrowserClient(env.url, env.anonKey);
  return browserClient;
}
