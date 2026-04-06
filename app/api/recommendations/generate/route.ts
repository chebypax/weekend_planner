import { NextResponse } from "next/server";
import { generateWeekendRecommendations } from "@/lib/weekend-planner/service";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { city?: string };
    const city = body.city?.trim() ?? "";

    if (!city) {
      return NextResponse.json({ error: "City is required." }, { status: 400 });
    }

    const result = await generateWeekendRecommendations({ city });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate recommendations.",
      },
      { status: 500 },
    );
  }
}
