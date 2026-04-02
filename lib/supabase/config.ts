const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseEnv =
  typeof supabaseUrl === "string" &&
  supabaseUrl.length > 0 &&
  typeof supabasePublishableKey === "string" &&
  supabasePublishableKey.length > 0;

export function getSupabaseSetupState() {
  if (hasSupabaseEnv) {
    return {
      ready: true,
      message:
        "Supabase environment variables are present, so the app is ready to connect when you start building features.",
    };
  }

  return {
    ready: false,
    message:
      "Supabase is installed but currently idle because env vars are not set yet, so the app still boots cleanly.",
  };
}

export function getSupabaseBrowserEnv() {
  if (!hasSupabaseEnv) {
    return null;
  }

  return {
    url: supabaseUrl!,
    publishableKey: supabasePublishableKey!,
  };
}
