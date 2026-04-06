import { NextResponse } from "next/server";
import { getRecommendationHistory } from "@/lib/weekend-planner/service";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitParam = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, 50))
      : 20;

    const page = await getRecommendationHistory({ cursor, limit });
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load recommendation history.",
      },
      { status: 500 },
    );
  }
}
