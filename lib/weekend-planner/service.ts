import { revalidateTag, unstable_cache } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  getRecommendationHistory as getRecommendationHistoryFromDb,
  listActiveHobbies,
  saveRecommendationRun,
} from "./db";
import { scoreHobbyForDay } from "./scoring";
import type {
  DayRecommendations,
  GeneratedRecommendations,
  RecommendationItem,
  WeatherSeaSummary,
} from "./types";
import { getUpcomingWeekendRange } from "./weekend";
import { fetchWeatherForCity } from "./weather";

const SCORE_VERSION = "v1_placeholder_marine";
const RECOMMENDATION_HISTORY_CACHE_TAG = "recommendation-history";
const RECOMMENDATION_HISTORY_CACHE_TTL_SECONDS = 60 * 60;

function buildWeatherSummary(input: {
  weatherDay: Awaited<ReturnType<typeof fetchWeatherForCity>>["days"][number];
  marineDay?: Awaited<ReturnType<typeof fetchWeatherForCity>>["marineDays"][number];
}): WeatherSeaSummary {
  const { weatherDay, marineDay } = input;
  return {
    avgAirTemp: (weatherDay.tempMax + weatherDay.tempMin) / 2,
    avgPrecipProbability: weatherDay.precipProbabilityMax,
    avgWindSpeed: weatherDay.windSpeedMax,
    avgWaveHeight: marineDay?.waveHeightMean ?? null,
    avgWaterTemperature: marineDay?.waterTemperatureMean ?? null,
  };
}

export async function generateWeekendRecommendations(input: {
  city: string;
  timeZone?: string;
}): Promise<GeneratedRecommendations> {
  const city = input.city.trim();
  if (!city) {
    throw new Error("City is required.");
  }
  if (!hasSupabaseEnv) {
    throw new Error("Supabase environment variables are missing.");
  }

  const weekendRange = getUpcomingWeekendRange(input.timeZone ?? "Europe/Madrid");
  const weather = await fetchWeatherForCity(city, weekendRange);
  const hobbies = await listActiveHobbies();

  if (hobbies.length === 0) {
    throw new Error("Please add at least one active hobby first.");
  }

  const dayRecommendations: DayRecommendations[] = weather.days.map((weatherDay) => {
    const marineDay = weather.marineDays.find((day) => day.date === weatherDay.date);
    const unsortedItems = hobbies.map((hobby) => {
      const result = scoreHobbyForDay({ hobby, weatherDay, marineDay });
      return {
        hobby,
        score: result.score,
        scoreBreakdown: result.scoreBreakdown,
        rationale: result.rationale,
      };
    });

    const ranked = unsortedItems
      .sort((a, b) => {
        if (b.score === a.score) {
          return a.hobby.name.localeCompare(b.hobby.name);
        }
        return b.score - a.score;
      })
      .map((item, index) => ({
        hobbyId: item.hobby.id,
        hobbyName: item.hobby.name,
        score: item.score,
        scoreBreakdown: item.scoreBreakdown,
        rationale: item.rationale,
        rankPosition: index + 1,
      }));

    const items: RecommendationItem[] = ranked.map((item) => ({
      id: `${weatherDay.date}:${item.rankPosition}:${item.hobbyId}`,
      runId: "",
      hobbyId: item.hobbyId,
      hobbyName: item.hobbyName,
      score: item.score,
      scoreBreakdown: item.scoreBreakdown,
      rationale: item.rationale,
      rankPosition: item.rankPosition,
    }));

    const date = new Date(`${weatherDay.date}T00:00:00`);
    const label = date.toLocaleDateString("en-US", { weekday: "long" });

    return {
      date: weatherDay.date,
      label,
      weatherSummary: buildWeatherSummary({ weatherDay, marineDay }),
      items,
    };
  });

  const aggregatedByHobby = new Map<
    string,
    {
      hobbyId: string;
      hobbyName: string;
      totalScore: number;
      entries: number;
      saturday?: RecommendationItem;
      sunday?: RecommendationItem;
    }
  >();

  for (const day of dayRecommendations) {
    for (const item of day.items) {
      const current =
        aggregatedByHobby.get(item.hobbyId) ??
        {
          hobbyId: item.hobbyId,
          hobbyName: item.hobbyName,
          totalScore: 0,
          entries: 0,
        };
      current.totalScore += item.score;
      current.entries += 1;
      if (day.date === weekendRange.saturday) {
        current.saturday = item;
      } else if (day.date === weekendRange.sunday) {
        current.sunday = item;
      }
      aggregatedByHobby.set(item.hobbyId, current);
    }
  }

  const ranked = Array.from(aggregatedByHobby.values())
    .map((entry) => ({
      hobbyId: entry.hobbyId,
      hobbyName: entry.hobbyName,
      score: entry.totalScore / Math.max(entry.entries, 1),
      scoreBreakdown:
        entry.saturday?.scoreBreakdown ?? entry.sunday?.scoreBreakdown ?? {
          base: 50,
          preferenceImpact: 0,
          temperatureImpact: 0,
          precipitationImpact: 0,
          windImpact: 0,
          marineImpact: 0,
          temperaturePreferenceImpact: 0,
          rainPreferenceImpact: 0,
          waterTemperaturePreferenceImpact: 0,
          waterTemperatureHardStopApplied: false,
          totalBeforeClamp: 50,
          finalScore: 50,
        },
      rationale: `Sat ${entry.saturday?.score.toFixed(1) ?? "n/a"} | Sun ${entry.sunday?.score.toFixed(1) ?? "n/a"}`,
    }))
    .sort((a, b) => {
      if (b.score === a.score) {
        return a.hobbyName.localeCompare(b.hobbyName);
      }
      return b.score - a.score;
    })
    .map((item, index) => ({
      ...item,
      rankPosition: index + 1,
    }));

  const runId = await saveRecommendationRun({
    city: weather.cityResolved,
    forecastDateStart: weekendRange.saturday,
    forecastDateEnd: weekendRange.sunday,
    scoreVersion: SCORE_VERSION,
    weatherSnapshot: weather,
    items: ranked.map((item) => ({
      hobbyId: item.hobbyId,
      score: item.score,
      scoreBreakdown: item.scoreBreakdown,
      rationale: item.rationale,
      rankPosition: item.rankPosition,
    })),
  });

  revalidateTag(RECOMMENDATION_HISTORY_CACHE_TAG);

  return {
    runId,
    weekendRange,
    cityResolved: weather.cityResolved,
    dayRecommendations: dayRecommendations.map((day) => ({
      ...day,
      items: day.items.map((item) => ({ ...item, runId })),
    })),
  };
}

const getRecommendationHistoryCached = unstable_cache(
  async (input: { limit: number; cursor?: string }) =>
    getRecommendationHistoryFromDb(input),
  ["recommendation-history-v1"],
  {
    revalidate: RECOMMENDATION_HISTORY_CACHE_TTL_SECONDS,
    tags: [RECOMMENDATION_HISTORY_CACHE_TAG],
  },
);

export async function getRecommendationHistory(input: {
  limit: number;
  cursor?: string;
}) {
  return getRecommendationHistoryCached(input);
}
