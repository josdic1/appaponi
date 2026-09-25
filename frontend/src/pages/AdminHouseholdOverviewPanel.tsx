import {
  Badge,
  Box,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  UsersRound,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  AdminRegistrationOverview,
} from "../api/admin";

import {
  loadRegistrationOverview,
} from "../api/admin";

type Props = {
  registrationId: string;
  onClose: () => void;
};

const dayFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
  );

const timeFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );

function roleLabel(
  role:
    | "primary"
    | "adult"
    | "child",
) {
  if (role === "primary") {
    return "Default lead";
  }

  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

export default function AdminHouseholdOverviewPanel({
  registrationId,
  onClose,
}: Props) {
  const [overview, setOverview] =
    useState<AdminRegistrationOverview | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    setOverview(null);
    setError(null);
    setLoading(true);

    loadRegistrationOverview(
      registrationId,
    )
      .then((next) => {
        if (!cancelled) {
          setOverview(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load household",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  const signupsByDay =
    useMemo(() => {
      if (!overview) {
        return [];
      }

      const groups =
        new Map<
          string,
          typeof overview.signups
        >();

      for (
        const signup of
        overview.signups
      ) {
        const key =
          new Date(
            signup.starts_at,
          ).toDateString();

        const current =
          groups.get(key) ?? [];

        current.push(signup);
        groups.set(
          key,
          current,
        );
      }

      return Array.from(
        groups.entries(),
      );
    }, [overview]);

  return (
    <Box
      data-testid="household-overview-panel"
      position={{
        base: "static",
        xl: "sticky",
      }}
      top={{ xl: "20px" }}
      alignSelf="start"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
    >
      <Box
        px="4"
        py="4"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <HStack
          justifyContent="space-between"
          alignItems="flex-start"
          gap="3"
        >
          <Stack gap="0" minW="0">
            <Text
              fontSize="xs"
              color="green.700"
              fontWeight="800"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Household
            </Text>

            <Text
              fontSize="lg"
              fontWeight="800"
            >
              {overview?.registration.household_name ??
                overview?.registration.username ??
                "Loading…"}
            </Text>

            {overview && (
              <Text
                fontSize="sm"
                color="gray.500"
              >
                {overview.registration.event_name}
              </Text>
            )}
          </Stack>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>
        </HStack>
      </Box>

      {loading ? (
        <Box p="5">
          <Text
            fontSize="sm"
            color="gray.500"
          >
            Loading household…
          </Text>
        </Box>
      ) : error ? (
        <Box p="5">
          <Text
            fontSize="sm"
            color="red.700"
          >
            {error}
          </Text>
        </Box>
      ) : overview ? (
        <Stack gap="0">
          <Box
            px="4"
            py="4"
            borderBottomWidth="1px"
            borderColor="gray.100"
          >
            <HStack
              alignItems="stretch"
              gap="2"
              flexWrap="wrap"
            >
              <Box
                flex="1"
                minW="100px"
                p="3"
                bg="gray.50"
                borderRadius="lg"
              >
                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  Attending
                </Text>

                <Text
                  mt="1"
                  fontWeight="800"
                  fontSize="lg"
                >
                  {overview.registration.selected_attendees}/{overview.registration.spots_paid_for}
                </Text>
              </Box>

              <Box
                flex="1"
                minW="100px"
                p="3"
                bg="gray.50"
                borderRadius="lg"
              >
                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  Cabin
                </Text>

                <Text
                  mt="1"
                  fontWeight="800"
                  fontSize="lg"
                >
                  {overview.registration.cabin_name ??
                    "Unassigned"}
                </Text>
              </Box>

              <Box
                flex="1"
                minW="100px"
                p="3"
                bg="gray.50"
                borderRadius="lg"
              >
                <Text
                  fontSize="xs"
                  color="gray.500"
                >
                  Activities
                </Text>

                <Text
                  mt="1"
                  fontWeight="800"
                  fontSize="lg"
                >
                  {overview.signups.length}
                </Text>
              </Box>
            </HStack>
          </Box>

          <Box
            px="4"
            py="4"
            borderBottomWidth="1px"
            borderColor="gray.100"
          >
            <HStack
              mb="3"
              gap="2"
            >
              <UsersRound
                size={16}
                strokeWidth={1.8}
              />

              <Text fontWeight="800">
                Household members
              </Text>
            </HStack>

            <Stack gap="3">
              {overview.members.map(
                (member) => (
                  <Box
                    key={member.id}
                    p="3"
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                  >
                    <HStack
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap="3"
                    >
                      <Stack
                        gap="0"
                        minW="0"
                      >
                        <Text fontWeight="800">
                          {member.full_name}
                        </Text>

                        <Text
                          fontSize="xs"
                          color="gray.500"
                        >
                          {roleLabel(
                            member.member_role,
                          )}
                        </Text>
                      </Stack>

                      <Badge
                        colorPalette={
                          member.attending
                            ? "green"
                            : "gray"
                        }
                      >
                        {member.attending
                          ? "Attending"
                          : "Not attending"}
                      </Badge>
                    </HStack>

                    {(member.email ||
                      member.phone ||
                      member.dietary_restrictions) && (
                      <Stack
                        gap="1"
                        mt="3"
                      >
                        {member.email && (
                          <HStack
                            gap="2"
                            color="gray.600"
                          >
                            <Mail
                              size={13}
                              strokeWidth={1.8}
                            />

                            <Text fontSize="xs">
                              {member.email}
                            </Text>
                          </HStack>
                        )}

                        {member.phone && (
                          <HStack
                            gap="2"
                            color="gray.600"
                          >
                            <Phone
                              size={13}
                              strokeWidth={1.8}
                            />

                            <Text fontSize="xs">
                              {member.phone}
                            </Text>
                          </HStack>
                        )}

                        {member.dietary_restrictions && (
                          <Text
                            fontSize="xs"
                            color="orange.700"
                            fontWeight="700"
                          >
                            Dietary · {member.dietary_restrictions}
                          </Text>
                        )}
                      </Stack>
                    )}
                  </Box>
                ),
              )}
            </Stack>
          </Box>

          <Box
            px="4"
            py="4"
          >
            <HStack
              mb="3"
              gap="2"
            >
              <CalendarDays
                size={16}
                strokeWidth={1.8}
              />

              <Text fontWeight="800">
                Activity sign-ups
              </Text>
            </HStack>

            {signupsByDay.length ? (
              <Stack gap="4">
                {signupsByDay.map(
                  ([
                    day,
                    signups,
                  ]) => (
                    <Box key={day}>
                      <Text
                        mb="2"
                        fontSize="xs"
                        color="gray.500"
                        fontWeight="800"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {dayFormatter.format(
                          new Date(
                            signups[0]
                              .starts_at,
                          ),
                        )}
                      </Text>

                      <Stack gap="2">
                        {signups.map(
                          (signup) => (
                            <Box
                              key={
                                signup.id
                              }
                              p="3"
                              bg="gray.50"
                              borderRadius="lg"
                            >
                              <HStack
                                justifyContent="space-between"
                                alignItems="flex-start"
                                gap="3"
                              >
                                <Stack
                                  gap="0"
                                  minW="0"
                                >
                                  <Text
                                    fontSize="sm"
                                    fontWeight="800"
                                  >
                                    {signup.activity_name}
                                  </Text>

                                  <HStack
                                    gap="1"
                                    color="gray.500"
                                  >
                                    <MapPin
                                      size={12}
                                      strokeWidth={1.8}
                                    />

                                    <Text fontSize="xs">
                                      {signup.area_name}
                                    </Text>
                                  </HStack>
                                </Stack>

                                {signup.checked_in_at && (
                                  <Badge
                                    colorPalette="green"
                                  >
                                    Checked in
                                  </Badge>
                                )}
                              </HStack>

                              <HStack
                                mt="2"
                                justifyContent="space-between"
                                gap="3"
                              >
                                <Text
                                  fontSize="xs"
                                  color="green.700"
                                  fontWeight="800"
                                >
                                  {signup.member_name}
                                </Text>

                                <Text
                                  fontSize="xs"
                                  color="gray.600"
                                >
                                  {timeFormatter.format(
                                    new Date(
                                      signup.starts_at,
                                    ),
                                  )}–{timeFormatter.format(
                                    new Date(
                                      signup.ends_at,
                                    ),
                                  )}
                                </Text>
                              </HStack>
                            </Box>
                          ),
                        )}
                      </Stack>
                    </Box>
                  ),
                )}
              </Stack>
            ) : (
              <Box
                p="4"
                bg="gray.50"
                borderRadius="lg"
              >
                <Text
                  fontSize="sm"
                  color="gray.500"
                >
                  No one in this household is signed up for an activity yet.
                </Text>
              </Box>
            )}
          </Box>
        </Stack>
      ) : null}
    </Box>
  );
}
