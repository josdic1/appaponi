import {
  useState,
} from "react";

import {
  Box,
  Button,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  setupOwnHousehold,
} from "../api/member";

import { useAuth } from "../hooks/useAuth";

type Props = {
  onComplete: () => void;
};

export default function MemberHouseholdSetupPage({
  onComplete,
}: Props) {
  const { logout } = useAuth();

  const [
    householdName,
    setHouseholdName,
  ] = useState("");

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [dietary, setDietary] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      await setupOwnHousehold({
        household_name:
          householdName,
        full_name: fullName,
        ...(email.trim()
          ? {
              email:
                email.trim(),
            }
          : {}),
        ...(phone.trim()
          ? {
              phone:
                phone.trim(),
            }
          : {}),
        ...(dietary.trim()
          ? {
              dietary_restrictions:
                dietary.trim(),
            }
          : {}),
      });

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not set up household",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      as="main"
      minH="100vh"
      display="grid"
      placeItems="center"
      p="24px"
      bg="#f6f5f1"
    >
      <Box
        as="section"
        w="full"
        maxW="520px"
        p="28px"
        borderWidth="1px"
        borderColor="#dddcd5"
        borderRadius="12px"
        bg="#ffffff"
      >
        <Stack
          direction="row"
          alignItems="center"
          gap="10px"
        >
          <Box
            w="28px"
            h="28px"
            display="grid"
            placeItems="center"
            flex="0 0 auto"
            borderRadius="8px"
            bg="var(--chakra-colors-green-600)"
            color="#ffffff"
            fontSize="12px"
            fontWeight="800"
          >
            A
          </Box>

          <Box>
            <Text
              fontSize="15px"
              fontWeight="760"
              letterSpacing="-0.03em"
            >
              Appaponi
            </Text>

            <Text
              mt="3px"
              color="#6d7169"
              fontSize="11px"
            >
              Household setup
            </Text>
          </Box>
        </Stack>

        <Box mt="26px" mb="4px">
          <Text
            as="h1"
            m="0"
            fontSize="26px"
            lineHeight="1.1"
            letterSpacing="-0.04em"
            fontWeight="700"
          >
            Set up your household
          </Text>

          <Text
            mt="8px"
            mb="0"
            color="#6d7169"
          >
            Add the household name and your own profile.
            You&apos;ll become the default household lead. The login
            still belongs to the household.
          </Text>
        </Box>

        <form onSubmit={submit}>
          <Stack
            gap="14px"
            mt="16px"
          >
          {[
            ["Household name", householdName, setHouseholdName, "Dicker Family", undefined],
            ["Your full name", fullName, setFullName, "Josh Dicker", undefined],
            ["Email", email, setEmail, "", "email"],
            ["Phone", phone, setPhone, "", undefined],
            ["Dietary notes", dietary, setDietary, "", undefined],
          ].map(([label, value, setter, placeholder, type], index) => (
            <Stack
              as="label"
              gap="6px"
              key={label as string}
            >
              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
                fontWeight="700"
              >
                {label as string}
              </Text>

              <Input
                autoFocus={index === 0}
                required={index < 2}
                type={(type as string | undefined) ?? "text"}
                value={value as string}
                placeholder={placeholder as string}
                minH="40px"
                borderColor="#c8c7bf"
                borderRadius="8px"
                bg="#ffffff"
                px="11px"
                _focus={{
                  borderColor: "var(--chakra-colors-green-600)",
                  boxShadow: "0 0 0 3px #e7f3ef",
                }}
                onChange={(event) =>
                  (setter as React.Dispatch<React.SetStateAction<string>>)(
                    event.target.value,
                  )
                }
              />
            </Stack>
          ))}

          {error && (
            <Box
              role="alert"
              px="12px"
              py="10px"
              borderRadius="8px"
              bg="#fff0ef"
              color="#b63a33"
              fontSize="12px"
              fontWeight="650"
            >
              {error}
            </Box>
          )}

          <Button
            type="submit"
            disabled={saving}
            w="full"
            minH="34px"
            borderWidth="1px"
            borderColor="var(--chakra-colors-green-600)"
            borderRadius="8px"
            bg="var(--chakra-colors-green-600)"
            px="14px"
            color="#ffffff"
            fontSize="12px"
            fontWeight="750"
            _hover={{
              borderColor: "var(--chakra-colors-green-700)",
              bg: "var(--chakra-colors-green-700)",
            }}
          >
            {saving
              ? "Saving…"
              : "Create household"}
          </Button>

          <Button
            type="button"
            minH="38px"
            border="0"
            bg="transparent"
            color="#6d7169"
            onClick={() =>
              void logout()
            }
          >
            Sign out
          </Button>
          </Stack>
        </form>
      </Box>
    </Box>
  );
}
