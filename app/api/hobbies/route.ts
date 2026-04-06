import { NextResponse } from "next/server";
import { createHobby, listHobbies } from "@/lib/weekend-planner/db";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  normalizeHobbyName,
  validateHobbyName,
} from "@/lib/weekend-planner/validation";

export async function GET() {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 503 },
    );
  }

  try {
    const hobbies = await listHobbies();
    return NextResponse.json({ hobbies });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load hobbies." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json(
      { error: "Supabase environment variables are missing." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { name?: string };
    const name = normalizeHobbyName(body.name ?? "");

    const validationError = validateHobbyName(name);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const hobbies = await listHobbies();
    const alreadyExists = hobbies.some(
      (hobby) => hobby.name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyExists) {
      return NextResponse.json(
        { error: "This hobby already exists in your list." },
        { status: 409 },
      );
    }

    const hobby = await createHobby(name);
    return NextResponse.json({ hobby }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create hobby.";
    if (message.toLowerCase().includes("row-level security")) {
      return NextResponse.json(
        {
          error:
            "Hobby insert is blocked by Supabase RLS policies. Run the latest migration with npx supabase db push.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
