import {
  useEffect,
  useState,
} from "react";

import {
  Box,
  Button,
  Stack,
  Text,
} from "@chakra-ui/react";

import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import {
  MataponiLoader,
} from "../components/feedback/MataponiLoader";

import {
  loadOwnHousehold,
} from "../api/member";

import { useAuth } from "../hooks/useAuth";

import MemberHouseholdSetupPage from "./MemberHouseholdSetupPage";
import MemberPage from "./MemberPage";

export default function MemberHouseholdGate() {
  const { logout } = useAuth();

  const [
    household,
    setHousehold,
  ] = useState<
    HouseholdMember[] | null
  >(null);

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    try {
      const next =
        await loadOwnHousehold();

      setHousehold(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load household",
      );
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (
    household === null &&
    !error
  ) {
    return <MataponiLoader />;
  }

  if (error) {
    return (
      <Box
        as="main"
        minH="100vh"
        display="grid"
        placeItems="center"
        p="24px"
        bg="#f6f5f1"
      >
        <Stack
          as="section"
          w="full"
          maxW="390px"
          gap="16px"
          p="28px"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
        >
          <Box
            mt="26px"
            mb="4px"
          >
            <Text
              as="h1"
              m="0"
              fontSize="26px"
              lineHeight="1.1"
              letterSpacing="-0.04em"
              fontWeight="700"
            >
              Could not load household
            </Text>

            <Text
              mt="8px"
              mb="0"
              color="#6d7169"
            >
              {error}
            </Text>
          </Box>

          <Button
            type="button"
            w="full"
            minH="34px"
            borderWidth="1px"
            borderColor="#007854"
            borderRadius="8px"
            bg="#007854"
            px="14px"
            color="#ffffff"
            fontSize="12px"
            fontWeight="750"
            _hover={{
              borderColor: "#005d41",
              bg: "#005d41",
            }}
            onClick={() =>
              void refresh()
            }
          >
            Try again
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
      </Box>
    );
  }

  if (
    household &&
    household.length === 0
  ) {
    return (
      <MemberHouseholdSetupPage
        onComplete={() =>
          void refresh()
        }
      />
    );
  }

  return <MemberPage />;
}
