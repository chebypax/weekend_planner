import type { MarineDay, WeatherDay, WeatherSnapshot, WeekendRange } from "./types";

const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const MARINE_BASE_URL = "https://marine-api.open-meteo.com/v1/marine";
const THIRD_PARTY_CACHE_REVALIDATE_SECONDS = 60 * 60;

interface GeocodingResponse {
  results?: Array<{
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
}

interface ForecastResponse {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
}

interface MarineResponse {
  hourly?: {
    time: string[];
    wave_height: Array<number | null>;
    sea_surface_temperature: Array<number | null>;
  };
}

function buildResolvedName(result: NonNullable<GeocodingResponse["results"]>[number]) {
  return [result.name, result.admin1, result.country].filter(Boolean).join(", ");
}

function validateDaily(response: ForecastResponse) {
  const daily = response.daily;
  if (!daily) {
    throw new Error("Weather API did not return daily data.");
  }

  const expectedLength = daily.time.length;
  const arrays = [
    daily.temperature_2m_max,
    daily.temperature_2m_min,
    daily.precipitation_probability_max,
    daily.wind_speed_10m_max,
    daily.weather_code,
  ];

  const hasMismatch = arrays.some((array) => array.length !== expectedLength);
  if (hasMismatch) {
    throw new Error("Weather API returned malformed daily arrays.");
  }

  return daily;
}

function toDateFromDateTime(isoDateTime: string) {
  return isoDateTime.slice(0, 10);
}

function averageNullable(values: Array<number | null>) {
  const presentValues = values.filter((value): value is number => value !== null);
  if (presentValues.length === 0) {
    return null;
  }
  return presentValues.reduce((sum, value) => sum + value, 0) / presentValues.length;
}

function aggregateMarineByDay(response: MarineResponse, weekendRange: WeekendRange): MarineDay[] {
  const hourly = response.hourly;
  if (!hourly) {
    return [];
  }

  const expectedLength = hourly.time.length;
  if (
    hourly.wave_height.length !== expectedLength ||
    hourly.sea_surface_temperature.length !== expectedLength
  ) {
    return [];
  }

  const dayMap = new Map<string, { waves: Array<number | null>; water: Array<number | null> }>();
  for (let index = 0; index < hourly.time.length; index += 1) {
    const date = toDateFromDateTime(hourly.time[index]);
    if (date !== weekendRange.saturday && date !== weekendRange.sunday) {
      continue;
    }
    const current = dayMap.get(date) ?? { waves: [], water: [] };
    current.waves.push(hourly.wave_height[index]);
    current.water.push(hourly.sea_surface_temperature[index]);
    dayMap.set(date, current);
  }

  return [weekendRange.saturday, weekendRange.sunday].map((date) => {
    const day = dayMap.get(date);
    if (!day) {
      return {
        date,
        waveHeightMean: null,
        waterTemperatureMean: null,
      };
    }
    return {
      date,
      waveHeightMean: averageNullable(day.waves),
      waterTemperatureMean: averageNullable(day.water),
    };
  });
}

export async function fetchWeatherForCity(
  city: string,
  weekendRange: WeekendRange,
): Promise<WeatherSnapshot> {
  const geocodingUrl = new URL(GEOCODING_BASE_URL);
  geocodingUrl.searchParams.set("name", city);
  geocodingUrl.searchParams.set("count", "1");
  geocodingUrl.searchParams.set("language", "en");
  geocodingUrl.searchParams.set("format", "json");

  const geocodeResponse = await fetch(geocodingUrl.toString(), {
    next: { revalidate: THIRD_PARTY_CACHE_REVALIDATE_SECONDS },
  });
  if (!geocodeResponse.ok) {
    throw new Error("Failed to resolve city via geocoding.");
  }

  const geocodeData = (await geocodeResponse.json()) as GeocodingResponse;
  const firstResult = geocodeData.results?.[0];

  if (!firstResult) {
    throw new Error("City was not found. Try a different city name.");
  }

  const timezone = firstResult.timezone ?? weekendRange.timezone;
  const forecastUrl = new URL(FORECAST_BASE_URL);
  forecastUrl.searchParams.set("latitude", String(firstResult.latitude));
  forecastUrl.searchParams.set("longitude", String(firstResult.longitude));
  forecastUrl.searchParams.set("start_date", weekendRange.saturday);
  forecastUrl.searchParams.set("end_date", weekendRange.sunday);
  forecastUrl.searchParams.set("timezone", timezone);
  forecastUrl.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "weather_code",
    ].join(","),
  );

  const forecastResponse = await fetch(forecastUrl.toString(), {
    next: { revalidate: THIRD_PARTY_CACHE_REVALIDATE_SECONDS },
  });
  if (!forecastResponse.ok) {
    throw new Error("Failed to fetch weather forecast.");
  }

  const forecastData = (await forecastResponse.json()) as ForecastResponse;
  const daily = validateDaily(forecastData);

  const days: WeatherDay[] = daily.time.map((date, index) => ({
    date,
    tempMax: daily.temperature_2m_max[index],
    tempMin: daily.temperature_2m_min[index],
    precipProbabilityMax: daily.precipitation_probability_max[index],
    windSpeedMax: daily.wind_speed_10m_max[index],
    weatherCode: daily.weather_code[index],
  }));

  let marineDays: MarineDay[] = [];
  try {
    const marineUrl = new URL(MARINE_BASE_URL);
    marineUrl.searchParams.set("latitude", String(firstResult.latitude));
    marineUrl.searchParams.set("longitude", String(firstResult.longitude));
    marineUrl.searchParams.set("start_date", weekendRange.saturday);
    marineUrl.searchParams.set("end_date", weekendRange.sunday);
    marineUrl.searchParams.set("timezone", timezone);
    marineUrl.searchParams.set("hourly", "wave_height,sea_surface_temperature");

    const marineResponse = await fetch(marineUrl.toString(), {
      next: { revalidate: THIRD_PARTY_CACHE_REVALIDATE_SECONDS },
    });
    if (marineResponse.ok) {
      const marineData = (await marineResponse.json()) as MarineResponse;
      marineDays = aggregateMarineByDay(marineData, weekendRange);
    }
  } catch {
    marineDays = [];
  }

  return {
    cityInput: city,
    cityResolved: buildResolvedName(firstResult),
    latitude: firstResult.latitude,
    longitude: firstResult.longitude,
    timezone,
    days,
    marineDays,
  };
}
