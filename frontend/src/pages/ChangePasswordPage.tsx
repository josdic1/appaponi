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

import {
  changePassword,
} from "../api/auth";

import {
  useAuth,
} from "../hooks/useAuth";

export default function ChangePasswordPage() {
  const { refresh, logout } = useAuth();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
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

    if (!newPassword) {
      setError(
        "Enter a new password.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New passwords do not match.",
      );
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Password change failed",
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
              Set your password
            </Heading>

            <Text color="gray.600">
              Replace the temporary password before continuing.
            </Text>
          </Stack>

          <Stack gap="5">
            <Field.Root>
              <Field.Label>
                Temporary password
              </Field.Label>

              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value,
                  )
                }
                size="lg"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                New password
              </Field.Label>

              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
                size="lg"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>
                Confirm new password
              </Field.Label>

              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
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
              loadingText="Saving…"
            >
              Set password
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              w="full"
              onClick={() => {
                void logout();
              }}
            >
              Sign out
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
