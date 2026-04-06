import type { HobbyPreferenceLevel } from "./types";

const HOBBY_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9 '&-]{0,58}[a-zA-Z0-9]$/;
export const HOBBY_PREFERENCE_LEVELS: HobbyPreferenceLevel[] = [
  "high",
  "medium",
  "low",
];

export function normalizeHobbyName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateHobbyName(value: string): string | null {
  const normalized = normalizeHobbyName(value);

  if (!normalized) {
    return "Please enter a hobby name.";
  }

  if (normalized.length < 2 || normalized.length > 60) {
    return "Hobby name must be between 2 and 60 characters.";
  }

  if (!HOBBY_NAME_PATTERN.test(normalized)) {
    return "Use letters, numbers, spaces, apostrophes, hyphens, or ampersands.";
  }

  return null;
}

export function isHobbyPreferenceLevel(value: unknown): value is HobbyPreferenceLevel {
  return (
    typeof value === "string" &&
    HOBBY_PREFERENCE_LEVELS.includes(value as HobbyPreferenceLevel)
  );
}
