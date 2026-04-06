import type { Hobby, MarineDay, ScoreBreakdown, WeatherDay } from "./types";
const RAIN_ALLOWED_MAJOR_BONUS = 18;
const RAIN_NOT_ALLOWED_VERY_BIG_PENALTY = -22;
const NO_RAIN_THRESHOLD = 20;
const RAIN_NOT_ALLOWED_LOW_RAIN_MODERATE_BONUS = 8;
const WATER_TEMP_MISS_THRESHOLD_HARD_STOP_C = 2;
const WATER_TEMP_BIG_PENALTY = -18;

const OUTDOOR_HINTS = [
  "hike",
  "cycling",
  "bike",
  "run",
  "walk",
  "picnic",
  "camp",
  "outdoor",
  "surf",
  "climb",
];

const SEA_HINTS = [
  "surf",
  "swim",
  "snorkel",
  "dive",
  "diving",
  "sail",
  "kayak",
  "paddle",
  "sup",
  "windsurf",
  "beach",
];

const SURF_EDUCATION_HINTS = [
  "surf lesson",
  "surfing lesson",
  "surfing education",
  "learn surf",
  "surf education",
  "beginner surf",
  "surf school",
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function isOutdoorHobby(name: string) {
  const lowerName = name.toLowerCase();
  return OUTDOOR_HINTS.some((hint) => lowerName.includes(hint));
}

function isSeaHobby(name: string) {
  const lowerName = name.toLowerCase();
  return SEA_HINTS.some((hint) => lowerName.includes(hint));
}

function isSurfEducationHobby(name: string) {
  const lowerName = name.toLowerCase();
  return SURF_EDUCATION_HINTS.some((hint) => lowerName.includes(hint));
}

function getTemperatureImpact(avgTemp: number) {
  if (avgTemp >= 15 && avgTemp <= 26) {
    return 10;
  }
  if (avgTemp >= 10 && avgTemp <= 30) {
    return 5;
  }
  return -8;
}

function getPrecipitationImpact(
  avgPrecipProbability: number,
  rainAllowed: Hobby["rainAllowed"],
) {
  if (rainAllowed === true && avgPrecipProbability <= NO_RAIN_THRESHOLD) {
    return 0;
  }

  if (avgPrecipProbability <= 20) {
    return 8;
  }
  if (avgPrecipProbability <= 50) {
    return 0;
  }
  return -12;
}

function getWindImpact(avgWindSpeed: number) {
  if (avgWindSpeed <= 20) {
    return 6;
  }
  if (avgWindSpeed <= 35) {
    return 0;
  }
  return -10;
}

function getPreferenceImpact(preferenceLevel: Hobby["preferenceLevel"]) {
  switch (preferenceLevel) {
    case "high":
      return 14;
    case "medium":
      return 0;
    case "low":
      return -10;
    default:
      return 0;
  }
}

function getMarineImpact(input: {
  hobbyName: string;
  isSeaActivity: boolean;
  avgWaveHeight: number | null;
  avgWaterTemperature: number | null;
}) {
  if (!input.isSeaActivity) {
    return 0;
  }

  if (input.avgWaveHeight === null || input.avgWaterTemperature === null) {
    return -4;
  }

  let waveImpact = 0;
  if (isSurfEducationHobby(input.hobbyName)) {
    // Beginner surf lessons are typically safest/productive around 1-3 ft (~0.3-0.9m).
    if (input.avgWaveHeight >= 0.3 && input.avgWaveHeight <= 0.9) {
      waveImpact = 18;
    } else {
      waveImpact = -22;
    }
  } else {
    if (input.avgWaveHeight >= 0.7 && input.avgWaveHeight <= 2) {
      waveImpact = 10;
    } else if (input.avgWaveHeight >= 0.3 && input.avgWaveHeight <= 2.8) {
      waveImpact = 4;
    } else {
      waveImpact = -6;
    }
  }

  let waterImpact = 0;
  if (input.avgWaterTemperature >= 18 && input.avgWaterTemperature <= 26) {
    waterImpact = 8;
  } else if (input.avgWaterTemperature >= 14 && input.avgWaterTemperature <= 30) {
    waterImpact = 3;
  } else {
    waterImpact = -7;
  }

  return waveImpact + waterImpact;
}

function getTemperaturePreferenceImpact(input: {
  hobby: Hobby;
  avgTemp: number;
}) {
  const { hobby, avgTemp } = input;
  const min = hobby.preferredTempMinC;
  const max = hobby.preferredTempMaxC;
  const SMALL_MISS_THRESHOLD_C = 3;
  const MAJOR_BONUS = 12;
  const SMALL_PENALTY = -5;
  const MAJOR_PENALTY = -14;

  if (min === null && max === null) {
    return 0;
  }

  if (min !== null && avgTemp < min) {
    const diff = min - avgTemp;
    return diff <= SMALL_MISS_THRESHOLD_C ? SMALL_PENALTY : MAJOR_PENALTY;
  }

  if (max !== null && avgTemp > max) {
    const diff = avgTemp - max;
    return diff <= SMALL_MISS_THRESHOLD_C ? SMALL_PENALTY : MAJOR_PENALTY;
  }

  return MAJOR_BONUS;
}

function getRainPreferenceImpact(input: {
  rainAllowed: Hobby["rainAllowed"];
  avgPrecipProbability: number;
}) {
  const { rainAllowed, avgPrecipProbability } = input;

  if (avgPrecipProbability <= NO_RAIN_THRESHOLD) {
    if (rainAllowed === false) {
      return RAIN_NOT_ALLOWED_LOW_RAIN_MODERATE_BONUS;
    }
    return 0;
  }

  if (rainAllowed === true) {
    return RAIN_ALLOWED_MAJOR_BONUS;
  }

  if (rainAllowed === false) {
    return RAIN_NOT_ALLOWED_VERY_BIG_PENALTY;
  }

  return 0;
}

function getWaterTemperaturePreferenceAdjustment(input: {
  preferredWaterTempMinC: Hobby["preferredWaterTempMinC"];
  avgWaterTemperature: number | null;
}) {
  const { preferredWaterTempMinC, avgWaterTemperature } = input;

  if (preferredWaterTempMinC === null || avgWaterTemperature === null) {
    return { impact: 0, hardStop: false };
  }

  if (avgWaterTemperature >= preferredWaterTempMinC) {
    return { impact: 0, hardStop: false };
  }

  const diff = preferredWaterTempMinC - avgWaterTemperature;
  if (diff <= WATER_TEMP_MISS_THRESHOLD_HARD_STOP_C) {
    return { impact: WATER_TEMP_BIG_PENALTY, hardStop: false };
  }

  return { impact: 0, hardStop: true };
}

export function scoreHobbyForDay(input: {
  hobby: Hobby;
  weatherDay: WeatherDay;
  marineDay?: MarineDay;
}): {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  rationale: string;
} {
  const { hobby, weatherDay, marineDay } = input;
  const base = 50;
  const avgTemp = (weatherDay.tempMax + weatherDay.tempMin) / 2;
  const avgPrecipProbability = weatherDay.precipProbabilityMax;
  const avgWindSpeed = weatherDay.windSpeedMax;
  const avgWaveHeight = marineDay?.waveHeightMean ?? null;
  const avgWaterTemperature = marineDay?.waterTemperatureMean ?? null;

  const preferenceImpact = getPreferenceImpact(hobby.preferenceLevel);
  const temperatureImpact = getTemperatureImpact(avgTemp);
  const precipitationImpact = getPrecipitationImpact(
    avgPrecipProbability,
    hobby.rainAllowed,
  );
  const windImpact = getWindImpact(avgWindSpeed);

  const outdoor = isOutdoorHobby(hobby.name);
  const seaActivity = isSeaHobby(hobby.name);
  const marineImpact = getMarineImpact({
    hobbyName: hobby.name,
    isSeaActivity: seaActivity,
    avgWaveHeight,
    avgWaterTemperature,
  });
  const temperaturePreferenceImpact = getTemperaturePreferenceImpact({
    hobby,
    avgTemp,
  });
  const rainPreferenceImpact = getRainPreferenceImpact({
    rainAllowed: hobby.rainAllowed,
    avgPrecipProbability,
  });
  const waterTemperaturePreference = getWaterTemperaturePreferenceAdjustment({
    preferredWaterTempMinC: hobby.preferredWaterTempMinC,
    avgWaterTemperature,
  });

  const totalBeforeClamp =
    base +
    preferenceImpact +
    temperatureImpact +
    precipitationImpact +
    windImpact +
    marineImpact +
    temperaturePreferenceImpact +
    rainPreferenceImpact +
    waterTemperaturePreference.impact;
  const finalScore = waterTemperaturePreference.hardStop
    ? 0
    : clampScore(totalBeforeClamp);

  const rationale = seaActivity
    ? avgWaveHeight === null || avgWaterTemperature === null
      ? `Sea activity: marine data unavailable, fallback scoring applied.`
      : `Sea activity: waves ${avgWaveHeight.toFixed(1)}m, water ${avgWaterTemperature.toFixed(1)}C, wind ${avgWindSpeed.toFixed(0)} km/h.`
    : outdoor
      ? `Outdoor activity: temperature ${avgTemp.toFixed(1)}C, rain risk ${avgPrecipProbability.toFixed(0)}%, wind ${avgWindSpeed.toFixed(0)} km/h.`
      : `Indoor-friendly activity with weather resilience and comfort boost.`;

  return {
    score: finalScore,
    scoreBreakdown: {
      base,
      preferenceImpact,
      temperatureImpact,
      precipitationImpact,
      windImpact,
      marineImpact,
      temperaturePreferenceImpact,
      rainPreferenceImpact,
      waterTemperaturePreferenceImpact: waterTemperaturePreference.impact,
      waterTemperatureHardStopApplied: waterTemperaturePreference.hardStop,
      totalBeforeClamp,
      finalScore,
    },
    rationale,
  };
}
