"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import type { RecommendationRun } from "@/lib/weekend-planner/types";

interface HistoryState {
  runs: RecommendationRun[];
  nextCursor: string | null;
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export function HistoryClient() {
  const [history, setHistory] = useState<HistoryState>({
    runs: [],
    nextCursor: null,
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory(nextCursor?: string) {
    setLoadingHistory(true);
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (nextCursor) {
        query.set("cursor", nextCursor);
      }
      const response = await fetch(`/api/recommendations/history?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as HistoryState;
      setHistory((prev) => ({
        runs: nextCursor ? [...prev.runs, ...(data.runs ?? [])] : data.runs ?? [],
        nextCursor: data.nextCursor ?? null,
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

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

          <Heading size="lg">Recommendation History</Heading>

          {error ? (
            <Card.Root borderColor="red.300" borderWidth="1px" bg="red.50">
              <Card.Body px="4" py="3">
                <Text color="red.900">{error}</Text>
              </Card.Body>
            </Card.Root>
          ) : null}

          <Stack gap="4">
            {history.runs.map((run) => (
              <Card.Root key={run.id} variant="subtle">
                <Card.Body px="4" py="3">
                  <Stack gap="3">
                    <Flex justify="space-between" gap="4" wrap="wrap">
                      <Text fontWeight="700">{run.city}</Text>
                      <Text fontSize="sm" color="gray.700">
                        {new Date(run.createdAt).toLocaleString()}
                      </Text>
                    </Flex>
                    <Text color="gray.700" fontSize="sm">
                      Weekend {run.forecastDateStart} - {run.forecastDateEnd} | Version{" "}
                      {run.scoreVersion}
                    </Text>
                    <Stack gap="2">
                      {run.items.map((item) => (
                        <Flex
                          key={item.id}
                          justify="space-between"
                          gap="4"
                          p="3"
                          rounded="lg"
                          bg="whiteAlpha.700"
                        >
                          <Text>
                            #{item.rankPosition} {item.hobbyName}
                          </Text>
                          <Badge colorPalette="blue">{item.score.toFixed(1)}</Badge>
                        </Flex>
                      ))}
                    </Stack>
                  </Stack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>

          {!loadingHistory && history.runs.length === 0 ? (
            <Text color="gray.600">No previous recommendations yet.</Text>
          ) : null}
          {loadingHistory ? <Text>Loading history...</Text> : null}
          {history.nextCursor ? (
            <Button
              alignSelf="flex-start"
              onClick={() => void loadHistory(history.nextCursor ?? undefined)}
              disabled={loadingHistory}
            >
              Load More
            </Button>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
