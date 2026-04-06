import type { WeekendRange } from "./types";

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateInTimeZone(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(now).split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function getUpcomingWeekendRange(timeZone: string): WeekendRange {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const todayIndex = WEEKDAY_TO_INDEX[weekday] ?? 0;
  const daysUntilSaturday = (6 - todayIndex + 7) % 7;

  const tzToday = dateInTimeZone(now, timeZone);
  const saturday = new Date(tzToday);
  saturday.setUTCDate(tzToday.getUTCDate() + daysUntilSaturday);

  const sunday = new Date(saturday);
  sunday.setUTCDate(saturday.getUTCDate() + 1);

  return {
    timezone: timeZone,
    saturday: toIsoDate(saturday),
    sunday: toIsoDate(sunday),
  };
}
