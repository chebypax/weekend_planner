import { NextResponse } from "next/server";
import {
  deleteHobby,
  setHobbyConditionPreferences,
  setHobbyActive,
  setHobbyPreferenceLevel,
} from "@/lib/weekend-planner/db";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { isHobbyPreferenceLevel } from "@/lib/weekend-planner/validation";

interface Context {
  params: Promise<{ id: string }>;
}

const TEMP_MIN_SANITY_C = -50;
const TEMP_MAX_SANITY_C = 60;
const WATER_TEMP_MIN_SANITY_C = -2;
const WATER_TEMP_MAX_SANITY_C = 45;

function isStrictBooleanOrNull(value: unknown): value is boolean | null {
  return typeof value === "boolean" || value === null;
}

function parseOptionalTemperature(
  value: unknown,
  fieldName: string,
  bounds: { min: number; max: number },
): { value?: number | null; error?: string } {
  if (value === undefined) {
    return {};
  }
  if (value === null) {
    return { value: null };
  }
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return { error: `${fieldName} must be a number or null.` };
  }
  if (numericValue < bounds.min || numericValue > bounds.max) {
    return {
      error: `${fieldName} must be between ${bounds.min} and ${bounds.max} Celsius.`,
    };
  }
  return { value: numericValue };
}

export async function PATCH(request: Request, context: Context) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      isActive?: boolean;
      preferenceLevel?: unknown;
      preferredTempMinC?: unknown;
      preferredTempMaxC?: unknown;
      preferredWaterTempMinC?: unknown;
      rainAllowed?: unknown;
    };
    const preferenceLevel = body.preferenceLevel;
    const preferredTempMin = parseOptionalTemperature(
      body.preferredTempMinC,
      "preferredTempMinC",
      { min: TEMP_MIN_SANITY_C, max: TEMP_MAX_SANITY_C },
    );
    const preferredTempMax = parseOptionalTemperature(
      body.preferredTempMaxC,
      "preferredTempMaxC",
      { min: TEMP_MIN_SANITY_C, max: TEMP_MAX_SANITY_C },
    );
    const preferredWaterTempMin = parseOptionalTemperature(
      body.preferredWaterTempMinC,
      "preferredWaterTempMinC",
      { min: WATER_TEMP_MIN_SANITY_C, max: WATER_TEMP_MAX_SANITY_C },
    );

    if (preferredTempMin.error || preferredTempMax.error || preferredWaterTempMin.error) {
      return NextResponse.json(
        {
          error:
            preferredTempMin.error ??
            preferredTempMax.error ??
            preferredWaterTempMin.error,
        },
        { status: 400 },
      );
    }

    const hasIsActive = typeof body.isActive === "boolean";
    const hasPreferenceLevel = isHobbyPreferenceLevel(preferenceLevel);
    const hasPreferredTempMin = body.preferredTempMinC !== undefined;
    const hasPreferredTempMax = body.preferredTempMaxC !== undefined;
    const hasPreferredWaterTempMin = body.preferredWaterTempMinC !== undefined;
    const hasRainAllowed = body.rainAllowed !== undefined;
    const hasValidRainAllowed =
      !hasRainAllowed || isStrictBooleanOrNull(body.rainAllowed);

    if (!hasValidRainAllowed) {
      return NextResponse.json(
        { error: "rainAllowed must be a boolean or null." },
        { status: 400 },
      );
    }

    const effectiveMin =
      hasPreferredTempMin && preferredTempMin.value !== undefined
        ? preferredTempMin.value
        : undefined;
    const effectiveMax =
      hasPreferredTempMax && preferredTempMax.value !== undefined
        ? preferredTempMax.value
        : undefined;

    if (
      effectiveMin !== undefined &&
      effectiveMax !== undefined &&
      effectiveMin !== null &&
      effectiveMax !== null &&
      effectiveMin > effectiveMax
    ) {
      return NextResponse.json(
        { error: "preferredTempMinC cannot be greater than preferredTempMaxC." },
        { status: 400 },
      );
    }

    if (
      !hasIsActive &&
      !hasPreferenceLevel &&
      !hasPreferredTempMin &&
      !hasPreferredTempMax &&
      !hasPreferredWaterTempMin &&
      !hasRainAllowed
    ) {
      return NextResponse.json(
        {
          error:
            "Provide at least one valid field: isActive, preferenceLevel, preferredTempMinC, preferredTempMaxC, preferredWaterTempMinC, rainAllowed.",
        },
        { status: 400 },
      );
    }

    if (hasIsActive) {
      await setHobbyActive(id, body.isActive!);
    }
    if (hasPreferenceLevel) {
      await setHobbyPreferenceLevel(id, preferenceLevel);
    }
    if (
      hasPreferredTempMin ||
      hasPreferredTempMax ||
      hasPreferredWaterTempMin ||
      hasRainAllowed
    ) {
      await setHobbyConditionPreferences(id, {
        preferredTempMinC: hasPreferredTempMin ? (effectiveMin ?? null) : undefined,
        preferredTempMaxC: hasPreferredTempMax ? (effectiveMax ?? null) : undefined,
        preferredWaterTempMinC: hasPreferredWaterTempMin
          ? (preferredWaterTempMin.value ?? null)
          : undefined,
        rainAllowed: hasRainAllowed ? (body.rainAllowed as boolean | null) : undefined,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update hobby." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    await deleteHobby(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete hobby." },
      { status: 500 },
    );
  }
}
