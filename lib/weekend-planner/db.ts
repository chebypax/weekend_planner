import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Hobby,
  HobbyPreferenceLevel,
  RecommendationHistoryPage,
  RecommendationItem,
  RecommendationRun,
  WeatherSnapshot,
} from "./types";

interface RecommendationItemInsert {
  hobbyId: string;
  score: number;
  scoreBreakdown: unknown;
  rationale: string;
  rankPosition: number;
}

function mapHobbyRow(row: {
  id: string;
  name: string;
  is_active: boolean;
  preference_level: HobbyPreferenceLevel;
  preferred_temp_min_c: number | string | null;
  preferred_temp_max_c: number | string | null;
  preferred_water_temp_min_c: number | string | null;
  rain_allowed: boolean | null;
  created_at: string;
}): Hobby {
  const preferredTempMinC =
    row.preferred_temp_min_c === null ? null : Number(row.preferred_temp_min_c);
  const preferredTempMaxC =
    row.preferred_temp_max_c === null ? null : Number(row.preferred_temp_max_c);
  const preferredWaterTempMinC =
    row.preferred_water_temp_min_c === null
      ? null
      : Number(row.preferred_water_temp_min_c);

  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    preferenceLevel: row.preference_level,
    preferredTempMinC: Number.isFinite(preferredTempMinC) ? preferredTempMinC : null,
    preferredTempMaxC: Number.isFinite(preferredTempMaxC) ? preferredTempMaxC : null,
    preferredWaterTempMinC: Number.isFinite(preferredWaterTempMinC)
      ? preferredWaterTempMinC
      : null,
    rainAllowed: row.rain_allowed,
    createdAt: row.created_at,
  };
}

export async function listHobbies(): Promise<Hobby[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("hobbies")
    .select(
      "id, name, is_active, preference_level, preferred_temp_min_c, preferred_temp_max_c, preferred_water_temp_min_c, rain_allowed, created_at",
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list hobbies: ${error.message}`);
  }

  return (data ?? []).map(mapHobbyRow);
}

export async function createHobby(name: string): Promise<Hobby> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("hobbies")
    .insert({ name: name.trim(), is_active: true, preference_level: "medium" })
    .select(
      "id, name, is_active, preference_level, preferred_temp_min_c, preferred_temp_max_c, preferred_water_temp_min_c, rain_allowed, created_at",
    )
    .single();

  if (error) {
    throw new Error(`Failed to create hobby: ${error.message}`);
  }

  return mapHobbyRow(data);
}

export async function setHobbyActive(
  hobbyId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("hobbies")
    .update({ is_active: isActive })
    .eq("id", hobbyId);

  if (error) {
    throw new Error(`Failed to update hobby: ${error.message}`);
  }
}

export async function setHobbyPreferenceLevel(
  hobbyId: string,
  preferenceLevel: HobbyPreferenceLevel,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("hobbies")
    .update({ preference_level: preferenceLevel })
    .eq("id", hobbyId);

  if (error) {
    throw new Error(`Failed to update hobby preference: ${error.message}`);
  }
}

export async function setHobbyConditionPreferences(
  hobbyId: string,
  input: {
    preferredTempMinC?: number | null;
    preferredTempMaxC?: number | null;
    preferredWaterTempMinC?: number | null;
    rainAllowed?: boolean | null;
  },
): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const updatePayload: {
    preferred_temp_min_c?: number | null;
    preferred_temp_max_c?: number | null;
    preferred_water_temp_min_c?: number | null;
    rain_allowed?: boolean | null;
  } = {};

  if (Object.prototype.hasOwnProperty.call(input, "preferredTempMinC")) {
    updatePayload.preferred_temp_min_c = input.preferredTempMinC;
  }
  if (Object.prototype.hasOwnProperty.call(input, "preferredTempMaxC")) {
    updatePayload.preferred_temp_max_c = input.preferredTempMaxC;
  }
  if (Object.prototype.hasOwnProperty.call(input, "preferredWaterTempMinC")) {
    updatePayload.preferred_water_temp_min_c = input.preferredWaterTempMinC;
  }
  if (Object.prototype.hasOwnProperty.call(input, "rainAllowed")) {
    updatePayload.rain_allowed = input.rainAllowed;
  }

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("hobbies")
    .update(updatePayload)
    .eq("id", hobbyId);

  if (error) {
    throw new Error(`Failed to update hobby weather preferences: ${error.message}`);
  }
}

export async function deleteHobby(hobbyId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("hobbies").delete().eq("id", hobbyId);
  if (error) {
    throw new Error(`Failed to delete hobby: ${error.message}`);
  }
}

export async function listActiveHobbies(): Promise<Hobby[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("hobbies")
    .select(
      "id, name, is_active, preference_level, preferred_temp_min_c, preferred_temp_max_c, preferred_water_temp_min_c, rain_allowed, created_at",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list active hobbies: ${error.message}`);
  }

  return (data ?? []).map(mapHobbyRow);
}

export async function saveRecommendationRun(payload: {
  city: string;
  forecastDateStart: string;
  forecastDateEnd: string;
  scoreVersion: string;
  weatherSnapshot: WeatherSnapshot;
  items: RecommendationItemInsert[];
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: run, error: runError } = await supabase
    .from("recommendation_runs")
    .insert({
      city: payload.city,
      forecast_date_start: payload.forecastDateStart,
      forecast_date_end: payload.forecastDateEnd,
      score_version: payload.scoreVersion,
      weather_snapshot: payload.weatherSnapshot,
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(`Failed to save recommendation run: ${runError?.message}`);
  }

  const rows = payload.items.map((item) => ({
    run_id: run.id,
    hobby_id: item.hobbyId,
    score: item.score,
    score_breakdown: item.scoreBreakdown,
    rationale: item.rationale,
    rank_position: item.rankPosition,
  }));

  const { error: itemsError } = await supabase
    .from("recommendation_items")
    .insert(rows);

  if (itemsError) {
    throw new Error(`Failed to save recommendation items: ${itemsError.message}`);
  }

  return run.id;
}

function mapRunRow(
  row: {
    id: string;
    city: string;
    forecast_date_start: string;
    forecast_date_end: string;
    score_version: string;
    weather_snapshot: WeatherSnapshot;
    created_at: string;
  },
  items: RecommendationItem[],
): RecommendationRun {
  return {
    id: row.id,
    city: row.city,
    forecastDateStart: row.forecast_date_start,
    forecastDateEnd: row.forecast_date_end,
    scoreVersion: row.score_version,
    weatherSnapshot: row.weather_snapshot,
    createdAt: row.created_at,
    items,
  };
}

export async function getRecommendationHistory(input: {
  limit: number;
  cursor?: string;
}): Promise<RecommendationHistoryPage> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { runs: [], nextCursor: null };
  }

  let query = supabase
    .from("recommendation_runs")
    .select(
      "id, city, forecast_date_start, forecast_date_end, score_version, weather_snapshot, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(input.limit + 1);

  if (input.cursor) {
    query = query.lt("created_at", input.cursor);
  }

  const { data: runRows, error: runsError } = await query;
  if (runsError) {
    throw new Error(`Failed to load recommendation history: ${runsError.message}`);
  }

  const pageRows = (runRows ?? []).slice(0, input.limit);
  const nextCursor =
    runRows && runRows.length > input.limit
      ? pageRows[pageRows.length - 1]?.created_at ?? null
      : null;

  if (pageRows.length === 0) {
    return { runs: [], nextCursor: null };
  }

  const runIds = pageRows.map((row) => row.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("recommendation_items")
    .select(
      "id, run_id, hobby_id, score, score_breakdown, rationale, rank_position, hobbies(id, name)",
    )
    .in("run_id", runIds)
    .order("rank_position", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load recommendation items: ${itemsError.message}`);
  }

  const itemsByRunId = new Map<string, RecommendationItem[]>();
  for (const row of itemRows ?? []) {
    const item: RecommendationItem = {
      id: row.id,
      runId: row.run_id,
      hobbyId: row.hobby_id,
      hobbyName: (row.hobbies as { name?: string } | null)?.name ?? "Unknown",
      score: Number(row.score),
      scoreBreakdown: row.score_breakdown,
      rationale: row.rationale,
      rankPosition: row.rank_position,
    };

    const list = itemsByRunId.get(row.run_id) ?? [];
    list.push(item);
    itemsByRunId.set(row.run_id, list);
  }

  return {
    runs: pageRows.map((row) => mapRunRow(row, itemsByRunId.get(row.id) ?? [])),
    nextCursor,
  };
}
