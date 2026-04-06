"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  InputGroup,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  GeneratedRecommendations,
  ScoreBreakdown,
} from "@/lib/weekend-planner/types";

interface WeekendPlannerClientProps {
  supabaseReady: boolean;
  supabaseMessage: string;
}

const FALLBACK_DEFAULT_CITY = "Barcelona";
const DEFAULT_CITY_STORAGE_KEY = "weekend_planner_default_city";
const PLANNER_STATE_STORAGE_KEY = "weekend_planner_main_state_v1";

interface PersistedPlannerState {
  city: string;
  latestGenerated: GeneratedRecommendations | null;
  selectedDayDate: string | null;
}

function formatScoreDebug(breakdown: ScoreBreakdown) {
  const parts = [
    `base ${breakdown.base}`,
    `priority ${breakdown.preferenceImpact >= 0 ? "+" : ""}${breakdown.preferenceImpact}`,
    `temp ${breakdown.temperatureImpact >= 0 ? "+" : ""}${breakdown.temperatureImpact}`,
    `rain ${breakdown.precipitationImpact >= 0 ? "+" : ""}${breakdown.precipitationImpact}`,
    `wind ${breakdown.windImpact >= 0 ? "+" : ""}${breakdown.windImpact}`,
    `marine ${breakdown.marineImpact >= 0 ? "+" : ""}${breakdown.marineImpact}`,
    `tempPref ${breakdown.temperaturePreferenceImpact >= 0 ? "+" : ""}${breakdown.temperaturePreferenceImpact}`,
    `rainPref ${breakdown.rainPreferenceImpact >= 0 ? "+" : ""}${breakdown.rainPreferenceImpact}`,
    `waterPref ${breakdown.waterTemperaturePreferenceImpact >= 0 ? "+" : ""}${breakdown.waterTemperaturePreferenceImpact}`,
    `waterStop ${breakdown.waterTemperatureHardStopApplied ? "yes" : "no"}`,
  ];

  return `${parts.join(" | ")} => total ${breakdown.totalBeforeClamp.toFixed(1)} -> final ${breakdown.finalScore.toFixed(1)}`;
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function WeekendPlannerClient({
  supabaseReady,
  supabaseMessage,
}: WeekendPlannerClientProps) {
  const [city, setCity] = useState(FALLBACK_DEFAULT_CITY);
  const [latestGenerated, setLatestGenerated] =
    useState<GeneratedRecommendations | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRestoredPlannerState, setHasRestoredPlannerState] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PLANNER_STATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedPlannerState>;
        const restoredCity =
          typeof parsed.city === "string" && parsed.city.trim()
            ? parsed.city.trim()
            : FALLBACK_DEFAULT_CITY;
        const restoredGenerated = parsed.latestGenerated ?? null;
        const restoredSelectedDay =
          typeof parsed.selectedDayDate === "string" ? parsed.selectedDayDate : null;

        setCity(restoredCity);
        setLatestGenerated(restoredGenerated);
        setSelectedDayDate(
          restoredSelectedDay ?? restoredGenerated?.dayRecommendations?.[0]?.date ?? null,
        );
        setHasRestoredPlannerState(true);
        return;
      }
    } catch {
      // Ignore corrupted persisted state and fall back to defaults.
    }

    const storedDefaultCity =
      window.localStorage.getItem(DEFAULT_CITY_STORAGE_KEY)?.trim() ??
      FALLBACK_DEFAULT_CITY;
    setCity(storedDefaultCity || FALLBACK_DEFAULT_CITY);
    setHasRestoredPlannerState(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredPlannerState) {
      return;
    }
    const payload: PersistedPlannerState = {
      city,
      latestGenerated,
      selectedDayDate,
    };
    window.sessionStorage.setItem(PLANNER_STATE_STORAGE_KEY, JSON.stringify(payload));
  }, [city, latestGenerated, selectedDayDate, hasRestoredPlannerState]);

  async function handleGeneratePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!city.trim()) {
      setError("Please enter a city.");
      return;
    }

    setGeneratingPlan(true);
    try {
      const response = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const generated = (await response.json()) as GeneratedRecommendations;
      setLatestGenerated(generated);
      setSelectedDayDate(generated.dayRecommendations[0]?.date ?? null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to generate recommendations.",
      );
    } finally {
      setGeneratingPlan(false);
    }
  }

  function handleSetDefaultCity() {
    setError(null);
    const normalizedCity = city.trim();
    if (!normalizedCity) {
      setError("Please enter a city before updating the default.");
      return;
    }
    window.localStorage.setItem(DEFAULT_CITY_STORAGE_KEY, normalizedCity);
  }

  return (
    <Box minH="100vh" py={{ base: "8", md: "14" }}>
      <Container maxW="7xl">
        <Stack
          gap="8"
          borderWidth="1px"
          borderColor="blackAlpha.200"
          rounded="3xl"
          bg="whiteAlpha.700"
          px={{ base: "4", md: "8" }}
          py={{ base: "5", md: "8" }}
          boxShadow="0 20px 50px rgba(23, 35, 31, 0.08)"
        >
          <Stack gap="3" pb="2">
            <Flex justify="space-between" align="center" gap="3" wrap="wrap">
              <Badge alignSelf="flex-start" colorPalette="teal" px="3" py="1" rounded="full">
                Weekend Planner v1
              </Badge>
              <HStack gap="3">
                <Button
                  variant="outline"
                  size="sm"
                  px="4"
                  py="2"
                  onClick={() => window.location.assign("/hobbies")}
                >
                  Hobbies
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  px="4"
                  py="2"
                  onClick={() => window.location.assign("/history")}
                >
                  See history
                </Button>
              </HStack>
            </Flex>
            <Heading fontSize={{ base: "3xl", md: "5xl" }} lineHeight="0.98">
              Weather-smart weekend recommendations for your hobbies
            </Heading>
            <Text color="gray.700" maxW="4xl">
              Build your activity list, fetch forecast-aware suggestions, and keep an archive of
              previous recommendation runs for comparison.
            </Text>
            {!supabaseReady ? (
              <Card.Root borderColor="orange.300" borderWidth="1px" bg="orange.50">
                <Card.Body px="4" py="3">
                  <Text color="orange.900">{supabaseMessage}</Text>
                </Card.Body>
              </Card.Root>
            ) : null}
            {error ? (
              <Card.Root borderColor="red.300" borderWidth="1px" bg="red.50">
                <Card.Body px="4" py="3">
                  <Text color="red.900">{error}</Text>
                </Card.Body>
              </Card.Root>
            ) : null}
          </Stack>

          <Card.Root borderWidth="1px" borderColor="blackAlpha.200">
            <Card.Header px={{ base: "4", md: "6" }} py={{ base: "4", md: "4" }}>
              <Heading size="md">Current Recommendations</Heading>
            </Card.Header>
            <Card.Body px={{ base: "4", md: "6" }} py={{ base: "4", md: "5" }}>
              <Stack gap="5">
                <form onSubmit={handleGeneratePlan}>
                  <HStack align="end">
                    <Box flex="1">
                      <Text mb="2" fontSize="sm" fontWeight="600">
                        City
                      </Text>
                      <InputGroup
                        endElement={
                          <Tooltip.Root positioning={{ placement: "top" }}>
                            <Tooltip.Trigger asChild>
                              <IconButton
                                size="xs"
                                variant="ghost"
                                aria-label="Save this city as default value"
                                onClick={handleSetDefaultCity}
                              >
                                <BookmarkCheck size={14} />
                              </IconButton>
                            </Tooltip.Trigger>
                            <Tooltip.Positioner>
                              <Tooltip.Content px="3" py="2">
                                save this city as default value
                              </Tooltip.Content>
                            </Tooltip.Positioner>
                          </Tooltip.Root>
                        }
                        endElementProps={{ pointerEvents: "auto" }}
                      >
                        <Input
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                          placeholder="Enter city (for example: Madrid)"
                          ps="4"
                          pe="10"
                          py="2"
                        />
                      </InputGroup>
                    </Box>
                    <Button
                      type="submit"
                      loading={generatingPlan}
                      disabled={!supabaseReady}
                      px="5"
                      py="2"
                    >
                      Generate
                    </Button>
                  </HStack>
                </form>

                {latestGenerated ? (
                  <Stack gap="4">
                    <Text color="gray.700" fontSize="sm">
                      {latestGenerated.cityResolved} | {latestGenerated.weekendRange.saturday} -{" "}
                      {latestGenerated.weekendRange.sunday}
                    </Text>

                    <Tabs.Root
                      value={selectedDayDate ?? latestGenerated.dayRecommendations[0]?.date}
                      onValueChange={(details) => setSelectedDayDate(String(details.value))}
                      variant="line"
                    >
                      <Tabs.List gap="3">
                        {latestGenerated.dayRecommendations.map((day) => (
                          <Tabs.Trigger key={day.date} value={day.date}>
                            {day.label}
                          </Tabs.Trigger>
                        ))}
                      </Tabs.List>
                    </Tabs.Root>

                    {(() => {
                      const activeDay =
                        latestGenerated.dayRecommendations.find(
                          (day) =>
                            day.date ===
                            (selectedDayDate ?? latestGenerated.dayRecommendations[0]?.date),
                        ) ?? latestGenerated.dayRecommendations[0];

                      if (!activeDay) {
                        return null;
                      }

                      return (
                        <Stack gap="4">
                          <SimpleGrid columns={{ base: 2, md: 5 }} gap="3">
                            <MetricWidget
                              label="Air Temp"
                              value={`${activeDay.weatherSummary.avgAirTemp.toFixed(1)} C`}
                            />
                            <MetricWidget
                              label="Rain Risk"
                              value={`${activeDay.weatherSummary.avgPrecipProbability.toFixed(0)}%`}
                            />
                            <MetricWidget
                              label="Wind"
                              value={`${activeDay.weatherSummary.avgWindSpeed.toFixed(0)} km/h`}
                            />
                            <MetricWidget
                              label="Wave Height"
                              value={
                                activeDay.weatherSummary.avgWaveHeight === null
                                  ? "n/a"
                                  : `${activeDay.weatherSummary.avgWaveHeight.toFixed(1)} m`
                              }
                            />
                            <MetricWidget
                              label="Water Temp"
                              value={
                                activeDay.weatherSummary.avgWaterTemperature === null
                                  ? "n/a"
                                  : `${activeDay.weatherSummary.avgWaterTemperature.toFixed(1)} C`
                              }
                            />
                          </SimpleGrid>

                          {activeDay.items.map((item) => (
                            <Card.Root key={item.id} variant="subtle">
                              <Card.Body px="4" py="3">
                                <Stack gap="2">
                                  <Flex justify="space-between" align="center">
                                    <HStack gap="2" align="center">
                                      <Text fontWeight="700">
                                        #{item.rankPosition} {item.hobbyName}
                                      </Text>
                                      {item.score === 0 ? (
                                        <Badge colorPalette="red" variant="subtle">
                                          Unavailable
                                        </Badge>
                                      ) : null}
                                    </HStack>
                                    <Badge colorPalette="green">
                                      Score {item.score.toFixed(1)}
                                    </Badge>
                                  </Flex>
                                  <Text color="gray.700">{item.rationale}</Text>
                                  <HStack gap="2" wrap="wrap">
                                    <Badge colorPalette="gray">
                                      Temp {item.scoreBreakdown.temperatureImpact}
                                    </Badge>
                                    <Badge colorPalette="gray">
                                      Rain {item.scoreBreakdown.precipitationImpact}
                                    </Badge>
                                    <Badge colorPalette="gray">
                                      Wind {item.scoreBreakdown.windImpact}
                                    </Badge>
                                    <Badge colorPalette="gray">
                                      Marine {item.scoreBreakdown.marineImpact}
                                    </Badge>
                                    <Badge colorPalette="gray">
                                      Temp Pref {item.scoreBreakdown.temperaturePreferenceImpact}
                                    </Badge>
                                    <Badge colorPalette="gray">
                                      Rain Pref {item.scoreBreakdown.rainPreferenceImpact}
                                    </Badge>
                                    <Badge colorPalette="gray">
                                      Water Pref{" "}
                                      {item.scoreBreakdown.waterTemperaturePreferenceImpact}
                                    </Badge>
                                    <Badge
                                      colorPalette={
                                        item.scoreBreakdown.waterTemperatureHardStopApplied
                                          ? "red"
                                          : "gray"
                                      }
                                    >
                                      Water Stop{" "}
                                      {item.scoreBreakdown.waterTemperatureHardStopApplied
                                        ? "Yes"
                                        : "No"}
                                    </Badge>
                                  </HStack>
                                  <Text fontSize="xs" color="gray.600">
                                    {formatScoreDebug(item.scoreBreakdown)}
                                  </Text>
                                </Stack>
                              </Card.Body>
                            </Card.Root>
                          ))}
                        </Stack>
                      );
                    })()}
                  </Stack>
                ) : (
                  <Text color="gray.600">Generate your first plan to see ranked activities.</Text>
                )}
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Container>
    </Box>
  );
}

function MetricWidget({ label, value }: { label: string; value: string }) {
  return (
    <Card.Root borderWidth="1px" borderColor="blackAlpha.200" bg="whiteAlpha.850">
      <Card.Body px="3" py="3">
        <Stack gap="1">
          <Text fontSize="xs" color="gray.600" textTransform="uppercase" letterSpacing="0.04em">
            {label}
          </Text>
          <Text fontWeight="700" color="gray.900">
            {value}
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}
