import { getSupabaseSetupState } from "@/lib/supabase/config";
import { WeekendPlannerClient } from "./weekend-planner-client";

export default function Home() {
  const supabase = getSupabaseSetupState();

  return (
    <WeekendPlannerClient
      supabaseReady={supabase.ready}
      supabaseMessage={supabase.message}
    />
  );
}
