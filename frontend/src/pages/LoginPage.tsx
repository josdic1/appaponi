import {
  Alert,
  Box,
  Button,
  Field,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  useState,
  type FormEvent,
} from "react";

import DevLoginMenu from "../components/dev/DevLoginMenu";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({
        username,
        password,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      display="grid"
      placeItems="center"
      px="4"
      py="10"
    >
      <DevLoginMenu />

      <Box
        as="form"
        onSubmit={submit}
        w="full"
        maxW="420px"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        p={{ base: "6", md: "8" }}
      >
        <Stack gap="7">
          <Stack gap="1">
            <Box
              w="10"
              h="10"
              display="grid"
              placeItems="center"
              borderRadius="md"
              bg="green.700"
              color="white"
              fontWeight="700"
              fontSize="lg"
            >
              A
            </Box>

            <Box pt="2">
              <Text
                fontWeight="700"
                fontSize="lg"
                lineHeight="1.2"
              >
                Appaponi
              </Text>

              <Text
                color="gray.500"
                fontSize="sm"
              >
                Camp App
              </Text>
            </Box>
          </Stack>

          <Stack gap="1">
            <Heading
              as="h1"
              size="2xl"
              letterSpacing="-0.02em"
            >
              Sign in
            </Heading>

            <Text color="gray.600">
              Enter your Appaponi account.
            </Text>
          </Stack>

          <Stack gap="5">
            <Field.Root>
              <Field.Label>
                Username
              </Field.Label>

              <Input
                autoComplete="username"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value,
                  )
                }
                size="lg"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                Password
              </Field.Label>

              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                size="lg"
              />
            </Field.Root>

            {error && (
              <Alert.Root status="error">
                <Alert.Indicator />

                <Alert.Content>
                  <Alert.Description>
                    {error}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            <Button
              type="submit"
              colorPalette="green"
              size="lg"
              w="full"
              loading={submitting}
              loadingText="Signing in…"
            >
              Sign in
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
