"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  HStack,
  Input,
  Separator,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import type { Hobby } from "@/lib/weekend-planner/types";
import {
  HOBBY_PREFERENCE_LEVELS,
  normalizeHobbyName,
  validateHobbyName,
} from "@/lib/weekend-planner/validation";

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

type RainAllowedUiValue = "yes" | "no" | "unset";

interface HobbyConditionDraft {
  preferredTempMinC: string;
  preferredTempMaxC: string;
  preferredWaterTempMinC: string;
  rainAllowed: RainAllowedUiValue;
}

const TEMP_MIN_SANITY_C = -50;
const TEMP_MAX_SANITY_C = 60;
const WATER_TEMP_MIN_SANITY_C = -2;
const WATER_TEMP_MAX_SANITY_C = 45;

function toRainAllowedUiValue(value: boolean | null): RainAllowedUiValue {
  if (value === true) {
    return "yes";
  }
  if (value === false) {
    return "no";
  }
  return "unset";
}

function fromRainAllowedUiValue(value: RainAllowedUiValue): boolean | null {
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  return null;
}

function parseOptionalTempInput(
  value: string,
  label: string,
  bounds: { min: number; max: number },
): { parsedValue: number | null; error: string | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { parsedValue: null, error: null };
  }

  const numericValue = Number(trimmed);
  if (!Number.isFinite(numericValue)) {
    return { parsedValue: null, error: `${label} must be a valid number.` };
  }
  if (numericValue < bounds.min || numericValue > bounds.max) {
    return {
      parsedValue: null,
      error: `${label} must be between ${bounds.min} and ${bounds.max} Celsius.`,
    };
  }

  return { parsedValue: numericValue, error: null };
}

export function HobbiesClient() {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [conditionDrafts, setConditionDrafts] = useState<
    Record<string, HobbyConditionDraft>
  >({});
  const [newHobby, setNewHobby] = useState("");
  const [loadingHobbies, setLoadingHobbies] = useState(false);
  const [savingHobby, setSavingHobby] = useState(false);
  const [savingConditionsHobbyId, setSavingConditionsHobbyId] = useState<string | null>(
    null,
  );
  const [hobbyPendingDelete, setHobbyPendingDelete] = useState<Hobby | null>(null);
  const [deletingHobbyId, setDeletingHobbyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshHobbies() {
    setLoadingHobbies(true);
    try {
      const response = await fetch("/api/hobbies", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as { hobbies: Hobby[] };
      const nextHobbies = data.hobbies ?? [];
      setHobbies(nextHobbies);
      setConditionDrafts(
        Object.fromEntries(
          nextHobbies.map((hobby) => [
            hobby.id,
            {
              preferredTempMinC:
                hobby.preferredTempMinC === null ? "" : String(hobby.preferredTempMinC),
              preferredTempMaxC:
                hobby.preferredTempMaxC === null ? "" : String(hobby.preferredTempMaxC),
              preferredWaterTempMinC:
                hobby.preferredWaterTempMinC === null
                  ? ""
                  : String(hobby.preferredWaterTempMinC),
              rainAllowed: toRainAllowedUiValue(hobby.rainAllowed),
            },
          ]),
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load hobbies.");
    } finally {
      setLoadingHobbies(false);
    }
  }

  useEffect(() => {
    void refreshHobbies();
  }, []);

  async function handleAddHobby(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const name = normalizeHobbyName(newHobby);
    const validationError = validateHobbyName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    const alreadyExists = hobbies.some(
      (hobby) => hobby.name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyExists) {
      setError("This hobby already exists in your list.");
      return;
    }

    setSavingHobby(true);
    try {
      const response = await fetch("/api/hobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      setNewHobby("");
      await refreshHobbies();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to add hobby.");
    } finally {
      setSavingHobby(false);
    }
  }

  async function handleToggleHobby(id: string, isActive: boolean) {
    setError(null);
    try {
      const response = await fetch(`/api/hobbies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await refreshHobbies();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to update hobby state.",
      );
    }
  }

  async function handleSetPreference(id: string, preferenceLevel: string) {
    setError(null);
    try {
      const response = await fetch(`/api/hobbies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferenceLevel }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await refreshHobbies();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to update hobby preference.",
      );
    }
  }

  async function handleDeleteHobby(id: string) {
    setError(null);
    setDeletingHobbyId(id);
    try {
      const response = await fetch(`/api/hobbies/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await refreshHobbies();
      setHobbyPendingDelete(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete hobby.");
    } finally {
      setDeletingHobbyId(null);
    }
  }

  function handleConditionDraftChange(
    hobbyId: string,
    patch: Partial<HobbyConditionDraft>,
  ) {
    setConditionDrafts((prev) => ({
      ...prev,
      [hobbyId]: {
        preferredTempMinC: prev[hobbyId]?.preferredTempMinC ?? "",
        preferredTempMaxC: prev[hobbyId]?.preferredTempMaxC ?? "",
        preferredWaterTempMinC: prev[hobbyId]?.preferredWaterTempMinC ?? "",
        rainAllowed: prev[hobbyId]?.rainAllowed ?? "unset",
        ...patch,
      },
    }));
  }

  async function handleSaveTemperaturePreferences(hobbyId: string) {
    setError(null);
    const hobby = hobbies.find((item) => item.id === hobbyId);
    if (!hobby) {
      return;
    }
    const draft = conditionDrafts[hobbyId] ?? {
      preferredTempMinC: "",
      preferredTempMaxC: "",
      preferredWaterTempMinC: "",
      rainAllowed: "unset" as RainAllowedUiValue,
    };

    const minResult = parseOptionalTempInput(draft.preferredTempMinC, "Min temperature", {
      min: TEMP_MIN_SANITY_C,
      max: TEMP_MAX_SANITY_C,
    });
    if (minResult.error) {
      setError(minResult.error);
      return;
    }

    const maxResult = parseOptionalTempInput(draft.preferredTempMaxC, "Max temperature", {
      min: TEMP_MIN_SANITY_C,
      max: TEMP_MAX_SANITY_C,
    });
    if (maxResult.error) {
      setError(maxResult.error);
      return;
    }
    const waterMinResult = parseOptionalTempInput(
      draft.preferredWaterTempMinC,
      "Min water temperature",
      {
        min: WATER_TEMP_MIN_SANITY_C,
        max: WATER_TEMP_MAX_SANITY_C,
      },
    );
    if (waterMinResult.error) {
      setError(waterMinResult.error);
      return;
    }

    if (
      minResult.parsedValue !== null &&
      maxResult.parsedValue !== null &&
      minResult.parsedValue > maxResult.parsedValue
    ) {
      setError("Min temperature cannot be greater than max temperature.");
      return;
    }

    const isUnchanged =
      hobby.preferredTempMinC === minResult.parsedValue &&
      hobby.preferredTempMaxC === maxResult.parsedValue &&
      hobby.preferredWaterTempMinC === waterMinResult.parsedValue;
    if (isUnchanged) {
      return;
    }

    setSavingConditionsHobbyId(hobbyId);
    try {
      const response = await fetch(`/api/hobbies/${hobbyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredTempMinC: minResult.parsedValue,
          preferredTempMaxC: maxResult.parsedValue,
          preferredWaterTempMinC: waterMinResult.parsedValue,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await refreshHobbies();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to update hobby weather preferences.",
      );
    } finally {
      setSavingConditionsHobbyId(null);
    }
  }

  async function handleSaveRainAllowed(hobbyId: string, rainAllowed: RainAllowedUiValue) {
    setError(null);
    const hobby = hobbies.find((item) => item.id === hobbyId);
    if (!hobby) {
      return;
    }
    const nextRainAllowed = fromRainAllowedUiValue(rainAllowed);
    if (hobby.rainAllowed === nextRainAllowed) {
      return;
    }

    handleConditionDraftChange(hobbyId, { rainAllowed });

    setSavingConditionsHobbyId(hobbyId);
    try {
      const response = await fetch(`/api/hobbies/${hobbyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rainAllowed: nextRainAllowed,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await refreshHobbies();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to update hobby weather preferences.",
      );
    } finally {
      setSavingConditionsHobbyId(null);
    }
  }

  return (
    <Box minH="100vh" py={{ base: "8", md: "14" }}>
      <Container maxW="7xl">
        <Stack
          gap="6"
          borderWidth="1px"
          borderColor="blackAlpha.200"
          rounded="3xl"
          bg="whiteAlpha.700"
          px={{ base: "4", md: "8" }}
          py={{ base: "5", md: "8" }}
        >
          <Flex justify="space-between" align="center" gap="3" wrap="wrap">
            <Badge colorPalette="teal" px="3" py="1" rounded="full">
              Weekend Planner v1
            </Badge>
            <Button
              variant="outline"
              size="sm"
              px="4"
              py="2"
              onClick={() => window.location.assign("/")}
            >
              Back to planner
            </Button>
          </Flex>

          <Heading size="lg">Hobby Management</Heading>

          {error ? (
            <Card.Root borderColor="red.300" borderWidth="1px" bg="red.50">
              <Card.Body px="4" py="3">
                <Text color="red.900">{error}</Text>
              </Card.Body>
            </Card.Root>
          ) : null}

          <Card.Root borderWidth="1px" borderColor="blackAlpha.200">
            <Card.Body px={{ base: "4", md: "6" }} py={{ base: "4", md: "5" }}>
              <Stack gap="4">
                <form onSubmit={handleAddHobby}>
                  <HStack align="end">
                    <Box flex="1">
                      <Text mb="2" fontSize="sm" fontWeight="600">
                        Add hobby
                      </Text>
                      <Input
                        value={newHobby}
                        onChange={(event) => setNewHobby(event.target.value)}
                        placeholder="e.g. Trail running"
                        px="4"
                        py="2"
                      />
                    </Box>
                    <Button type="submit" loading={savingHobby}>
                      Add
                    </Button>
                  </HStack>
                </form>

                <Separator />

                {loadingHobbies ? <Text>Loading hobbies...</Text> : null}
                <Stack gap="3">
                  {hobbies.map((hobby) => (
                    <Card.Root key={hobby.id} variant="outline">
                      <Card.Body px="4" py="3">
                        <Flex justify="space-between" align="center" gap="3" wrap="wrap">
                          <Text fontWeight="600">{hobby.name}</Text>
                          <HStack>
                            <Switch.Root
                              checked={hobby.isActive}
                              onCheckedChange={(details) =>
                                void handleToggleHobby(hobby.id, Boolean(details.checked))
                              }
                            >
                              <Switch.HiddenInput />
                              <Switch.Control />
                              <Switch.Label>Active</Switch.Label>
                            </Switch.Root>
                            <Button
                              size="sm"
                              colorPalette="red"
                              variant="ghost"
                              onClick={() => setHobbyPendingDelete(hobby)}
                            >
                              Delete
                            </Button>
                          </HStack>
                        </Flex>
                        <HStack mt="3" gap="2" wrap="wrap">
                          <Text fontSize="sm" color="gray.600">
                            Priority:
                          </Text>
                          {HOBBY_PREFERENCE_LEVELS.map((level) => (
                            <Button
                              key={level}
                              size="xs"
                              px="3"
                              py="1"
                              variant={
                                hobby.preferenceLevel === level ? "solid" : "outline"
                              }
                              colorPalette={
                                level === "high"
                                  ? "green"
                                  : level === "medium"
                                    ? "blue"
                                    : "gray"
                              }
                              onClick={() => void handleSetPreference(hobby.id, level)}
                            >
                              {level[0].toUpperCase()}
                              {level.slice(1)}
                            </Button>
                          ))}
                        </HStack>
                        <Stack mt="4" gap="3">
                          <HStack gap="3" align="end" wrap="wrap">
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb="1">
                                Temp min (C)
                              </Text>
                              <Input
                                type="number"
                                value={conditionDrafts[hobby.id]?.preferredTempMinC ?? ""}
                                onChange={(event) =>
                                  handleConditionDraftChange(hobby.id, {
                                    preferredTempMinC: event.target.value,
                                  })
                                }
                                onBlur={() => void handleSaveTemperaturePreferences(hobby.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                }}
                                placeholder="Optional"
                                px="4"
                                py="2"
                                w="140px"
                              />
                            </Box>
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb="1">
                                Temp max (C)
                              </Text>
                              <Input
                                type="number"
                                value={conditionDrafts[hobby.id]?.preferredTempMaxC ?? ""}
                                onChange={(event) =>
                                  handleConditionDraftChange(hobby.id, {
                                    preferredTempMaxC: event.target.value,
                                  })
                                }
                                onBlur={() => void handleSaveTemperaturePreferences(hobby.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                }}
                                placeholder="Optional"
                                px="4"
                                py="2"
                                w="140px"
                              />
                            </Box>
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb="1">
                                Water temp min (C)
                              </Text>
                              <Input
                                type="number"
                                value={conditionDrafts[hobby.id]?.preferredWaterTempMinC ?? ""}
                                onChange={(event) =>
                                  handleConditionDraftChange(hobby.id, {
                                    preferredWaterTempMinC: event.target.value,
                                  })
                                }
                                onBlur={() => void handleSaveTemperaturePreferences(hobby.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                }}
                                placeholder="Optional"
                                px="4"
                                py="2"
                                w="170px"
                              />
                            </Box>
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb="1">
                                Rain allowed
                              </Text>
                              <HStack gap="2">
                                <Button
                                  size="xs"
                                  px="3"
                                  py="1"
                                  variant={
                                    (conditionDrafts[hobby.id]?.rainAllowed ?? "unset") === "yes"
                                      ? "solid"
                                      : "outline"
                                  }
                                  colorPalette="blue"
                                  loading={
                                    savingConditionsHobbyId === hobby.id &&
                                    (conditionDrafts[hobby.id]?.rainAllowed ?? "unset") === "yes"
                                  }
                                  onClick={() =>
                                    void handleSaveRainAllowed(hobby.id, "yes")
                                  }
                                >
                                  Yes
                                </Button>
                                <Button
                                  size="xs"
                                  px="3"
                                  py="1"
                                  variant={
                                    (conditionDrafts[hobby.id]?.rainAllowed ?? "unset") === "no"
                                      ? "solid"
                                      : "outline"
                                  }
                                  colorPalette="blue"
                                  loading={
                                    savingConditionsHobbyId === hobby.id &&
                                    (conditionDrafts[hobby.id]?.rainAllowed ?? "unset") === "no"
                                  }
                                  onClick={() =>
                                    void handleSaveRainAllowed(hobby.id, "no")
                                  }
                                >
                                  No
                                </Button>
                                <Button
                                  size="xs"
                                  px="3"
                                  py="1"
                                  variant={
                                    (conditionDrafts[hobby.id]?.rainAllowed ?? "unset") ===
                                    "unset"
                                      ? "solid"
                                      : "outline"
                                  }
                                  colorPalette="gray"
                                  loading={
                                    savingConditionsHobbyId === hobby.id &&
                                    (conditionDrafts[hobby.id]?.rainAllowed ?? "unset") ===
                                      "unset"
                                  }
                                  onClick={() =>
                                    void handleSaveRainAllowed(hobby.id, "unset")
                                  }
                                >
                                  Not set
                                </Button>
                              </HStack>
                            </Box>
                          </HStack>
                        </Stack>
                      </Card.Body>
                    </Card.Root>
                  ))}
                  {!loadingHobbies && hobbies.length === 0 ? (
                    <Text color="gray.600">No hobbies yet. Add your first one to begin.</Text>
                  ) : null}
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>
      </Container>

      <Dialog.Root
        open={Boolean(hobbyPendingDelete)}
        onOpenChange={(details) => {
          if (!details.open) {
            setHobbyPendingDelete(null);
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete hobby?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                Are you sure you want to delete{" "}
                <Text as="span" fontWeight="700">
                  {hobbyPendingDelete?.name}
                </Text>
                ?
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap="3">
                <Button
                  variant="outline"
                  px="4"
                  py="2"
                  onClick={() => setHobbyPendingDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  px="4"
                  py="2"
                  loading={
                    hobbyPendingDelete !== null &&
                    deletingHobbyId === hobbyPendingDelete.id
                  }
                  onClick={() =>
                    hobbyPendingDelete
                      ? void handleDeleteHobby(hobbyPendingDelete.id)
                      : undefined
                  }
                >
                  Ok
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
