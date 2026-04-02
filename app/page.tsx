import {
  Badge,
  Box,
  Code,
  Container,
  Flex,
  Heading,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowRight, Database, Rocket, ShieldCheck } from "lucide-react";
import { getSupabaseSetupState } from "@/lib/supabase/config";

export default function Home() {
  const supabase = getSupabaseSetupState();

  return (
    <Box minH="100vh" py={{ base: "12", md: "20" }}>
      <Container maxW="6xl">
        <Stack gap="10">
          <Box
            rounded="full"
            borderWidth="1px"
            borderColor="orange.200"
            bg="orange.50"
            px="5"
            py="3"
            alignSelf="flex-start"
          >
            <Text fontWeight="700" fontStyle="italic" color="orange.900">
              🤪 It is a last check before we start
            </Text>
          </Box>

          <Stack gap="6" maxW="3xl">
            <Badge
              alignSelf="flex-start"
              colorPalette="green"
              px="3"
              py="1"
              rounded="full"
              fontSize="sm"
            >
              Next.js + Chakra UI + Supabase
            </Badge>
            <Heading
              as="h1"
              fontSize={{ base: "4xl", md: "6xl" }}
              lineHeight="0.95"
              letterSpacing="-0.05em"
              color="gray.900"
            >
              Your app foundation is ready for product-specific work.
            </Heading>
            <Text fontSize={{ base: "lg", md: "xl" }} color="gray.700">
              This starter is set up for App Router, TypeScript, Vercel
              deployment, Chakra UI, Lucide icons, and Supabase integration
              without crashing before database env vars exist.
            </Text>
            <Flex gap="4" wrap="wrap">
              <Link
                href="https://vercel.com/new"
                target="_blank"
                display="inline-flex"
                alignItems="center"
                gap="2"
                px="5"
                py="3"
                rounded="xl"
                bg="gray.900"
                color="white"
                fontWeight="600"
                _hover={{ bg: "gray.700" }}
              >
                Deploy on Vercel
                <ArrowRight size={18} />
              </Link>
              <Link
                href="https://nextjs.org/docs"
                target="_blank"
                display="inline-flex"
                alignItems="center"
                px="5"
                py="3"
                rounded="xl"
                borderWidth="1px"
                borderColor="blackAlpha.200"
                bg="whiteAlpha.700"
                color="gray.900"
                fontWeight="600"
                _hover={{ bg: "whiteAlpha.900" }}
              >
                Read the docs
              </Link>
            </Flex>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap="5">
            <FeatureCard
              title="Modern stack"
              description="Next.js 16 with App Router, React 19, TypeScript 5, and a clean deploy path to Vercel."
              icon={<Rocket size={22} />}
            />
            <FeatureCard
              title="UI ready"
              description="Chakra UI is wired at the root so new routes and components can use the design system immediately."
              icon={<ShieldCheck size={22} />}
            />
            <FeatureCard
              title="Database safe"
              description={supabase.message}
              icon={<Database size={22} />}
              accent={supabase.ready ? "green.500" : "orange.500"}
            />
          </SimpleGrid>

          <Box
            rounded="3xl"
            borderWidth="1px"
            borderColor="blackAlpha.200"
            bg="whiteAlpha.800"
            backdropFilter="blur(14px)"
            px={{ base: "6", md: "8" }}
            py={{ base: "6", md: "8" }}
            boxShadow="0 24px 80px rgba(23, 35, 31, 0.08)"
          >
            <Stack gap="4">
              <Text fontWeight="700" fontSize="xl" color="gray.900">
                When you are ready for Supabase
              </Text>
              <Text color="gray.700">
                Add these variables to <Code>.env.local</Code> and the helpers
                in <Code>lib/supabase</Code> will begin returning a real client.
              </Text>
              <Stack
                gap="3"
                rounded="2xl"
                bg="gray.950"
                color="gray.50"
                px="5"
                py="5"
                fontFamily="mono"
                fontSize="sm"
              >
                <Text>NEXT_PUBLIC_SUPABASE_URL=...</Text>
                <Text>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</Text>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  accent = "gray.900",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <Stack
      gap="4"
      rounded="3xl"
      borderWidth="1px"
      borderColor="blackAlpha.200"
      bg="whiteAlpha.900"
      px="6"
      py="6"
      boxShadow="0 18px 40px rgba(23, 35, 31, 0.05)"
    >
      <Flex
        align="center"
        justify="center"
        w="12"
        h="12"
        rounded="2xl"
        bg={accent}
        color="white"
      >
        {icon}
      </Flex>
      <Stack gap="2">
        <Text fontSize="xl" fontWeight="700" color="gray.900">
          {title}
        </Text>
        <Text color="gray.700">{description}</Text>
      </Stack>
    </Stack>
  );
}
