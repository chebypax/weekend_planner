export interface Hobby {
  id: string;
  name: string;
  isActive: boolean;
  preferenceLevel: HobbyPreferenceLevel;
  preferredTempMinC: number | null;
  preferredTempMaxC: number | null;
  preferredWaterTempMinC: number | null;
  rainAllowed: boolean | null;
  createdAt: string;
}

export type HobbyPreferenceLevel = "high" | "medium" | "low";

export interface WeekendRange {
  timezone: string;
  saturday: string;
  sunday: string;
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProbabilityMax: number;
  windSpeedMax: number;
  weatherCode: number;
}

export interface MarineDay {
  date: string;
  waveHeightMean: number | null;
  waterTemperatureMean: number | null;
}

export interface WeatherSnapshot {
  cityInput: string;
  cityResolved: string;
  latitude: number;
  longitude: number;
  timezone: string;
  days: WeatherDay[];
  marineDays: MarineDay[];
}

export interface ScoreBreakdown {
  base: number;
  preferenceImpact: number;
  temperatureImpact: number;
  precipitationImpact: number;
  windImpact: number;
  marineImpact: number;
  temperaturePreferenceImpact: number;
  rainPreferenceImpact: number;
  waterTemperaturePreferenceImpact: number;
  waterTemperatureHardStopApplied: boolean;
  totalBeforeClamp: number;
  finalScore: number;
}

export interface RecommendationItem {
  id: string;
  runId: string;
  hobbyId: string;
  hobbyName: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rationale: string;
  rankPosition: number;
}

export interface RecommendationRun {
  id: string;
  city: string;
  forecastDateStart: string;
  forecastDateEnd: string;
  scoreVersion: string;
  weatherSnapshot: WeatherSnapshot;
  createdAt: string;
  items: RecommendationItem[];
}

export interface RecommendationHistoryPage {
  runs: RecommendationRun[];
  nextCursor: string | null;
}

export interface WeatherSeaSummary {
  avgAirTemp: number;
  avgPrecipProbability: number;
  avgWindSpeed: number;
  avgWaveHeight: number | null;
  avgWaterTemperature: number | null;
}

export interface DayRecommendations {
  date: string;
  label: string;
  weatherSummary: WeatherSeaSummary;
  items: RecommendationItem[];
}

export interface GeneratedRecommendations {
  runId: string;
  weekendRange: WeekendRange;
  cityResolved: string;
  dayRecommendations: DayRecommendations[];
}
