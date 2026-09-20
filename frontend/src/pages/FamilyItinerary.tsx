import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Box,
  Button,
  Grid,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

import type {
  ActivitySignup,
  MemberAttendee,
} from "@appoponi/shared/schemas/registration";

import type {
  EventActivity,
} from "@appoponi/shared/schemas/scheduling";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

import type {
  CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

type ActivityWithCount =
  EventActivity & {
    signup_count: number;
  };

type Props = {
  activities: ActivityWithCount[];
  meals: EventMeal[];
  attendees: MemberAttendee[];
  signups: ActivitySignup[];
  changesUnavailable: boolean;
  onToggleSignup: (
    activity: ActivityWithCount,
    attendee: MemberAttendee,
    signup: ActivitySignup | null,
  ) => void;
  onShowOnMap: (targetId: CampMapPlaceId) => void;
  onOpenMeal: (meal: EventMeal) => void;
};

type TimelineEntry =
  | {
      kind: "activity";
      starts_at: string;
      ends_at: string;
      activity: ActivityWithCount;
    }
  | {
      kind: "meal";
      starts_at: string;
      ends_at: string;
      meal: EventMeal;
    };

function localDayKey(
  value: string,
) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(date.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function dayLabel(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FamilyItinerary({
  activities,
  meals,
  attendees,
  signups,
  changesUnavailable,
  onToggleSignup,
  onShowOnMap,
  onOpenMeal,
}: Props) {
  const [editingActivityId, setEditingActivityId] =
    useState<string | null>(null);

  const entries = useMemo<TimelineEntry[]>(
    () =>
      [
        ...activities.map(
          (activity) => ({
            kind: "activity" as const,
            starts_at: activity.starts_at,
            ends_at: activity.ends_at,
            activity,
          }),
        ),
        ...meals.map((meal) => ({
          kind: "meal" as const,
          starts_at: meal.starts_at,
          ends_at: meal.ends_at,
          meal,
        })),
      ].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() -
          new Date(b.starts_at).getTime(),
      ),
    [activities, meals],
  );

  const dayGroups = useMemo(() => {
    const grouped = new Map<string, TimelineEntry[]>();

    for (const entry of entries) {
      const key = localDayKey(entry.starts_at);
      grouped.set(key, [
        ...(grouped.get(key) ?? []),
        entry,
      ]);
    }

    return [...grouped.entries()];
  }, [entries]);

  const [selectedDayKey, setSelectedDayKey] =
    useState<string | null>(null);

  useEffect(() => {
    const firstDayKey = dayGroups[0]?.[0] ?? null;

    if (
      !selectedDayKey ||
      !dayGroups.some(([key]) => key === selectedDayKey)
    ) {
      setSelectedDayKey(firstDayKey);
      setEditingActivityId(null);
    }
  }, [dayGroups, selectedDayKey]);

  const selectedDay =
    dayGroups.find(([key]) => key === selectedDayKey) ??
    dayGroups[0] ??
    null;

  if (!entries.length) {
    return (
      <Box
        as="section"
        mb="16px"
        overflow="hidden"
        borderWidth="1px"
        borderColor="#dddcd5"
        borderRadius="12px"
        bg="#ffffff"
        px="20px"
        py="32px"
        color="#6d7169"
        textAlign="center"
        fontSize="12px"
      >
        No itinerary has been scheduled yet.
      </Box>
    );
  }

  return (
    <Box
      as="section"
      my="22px"
    >
      <Box
        display="flex"
        alignItems="flex-end"
        justifyContent="space-between"
        gap="12px"
        mb="10px"
      >
        <Box>
          <Text
            mb="7px"
            color="var(--chakra-colors-green-700)"
            fontSize="10px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            FAMILY ITINERARY
          </Text>

          <Text
            as="h2"
            m="0"
            fontSize="23px"
            lineHeight="1.1"
            letterSpacing="-0.035em"
            fontWeight="700"
          >
            Daily schedule
          </Text>

          <Text
            mt="7px"
            mb="0"
            color="#6d7169"
            fontSize="13px"
            lineHeight="1.45"
          >
            Meals, campwide events, and your family&apos;s activity
            signups in one place.
          </Text>
        </Box>
      </Box>

      <Box
        position="sticky"
        top="68px"
        zIndex="9"
        mb="10px"
        py="6px"
        bg="#f6f5f1"
        css={{
          "@media (max-width: 620px)": {
            top: "64px",
            marginInline: "-4px",
          },
        }}
      >
        <Box
          as="nav"
          aria-label="Choose itinerary day"
          w="fit-content"
          maxW="100%"
          display="flex"
          alignItems="stretch"
          mx="auto"
          overflowX="auto"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="8px"
          bg="#ffffff"
          p="3px"
          css={{
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
            "@media (max-width: 620px)": {
              width: "100%",
              justifyContent: "flex-start",
            },
          }}
        >
          {dayGroups.map(([key, dayEntries]) => {
            const date = new Date(dayEntries[0].starts_at);
            const weekday = date.toLocaleDateString([], {
              weekday: "short",
            });
            const dayNumber = date.toLocaleDateString([], {
              day: "numeric",
            });
            const selected = key === selectedDayKey;

            return (
              <Button
                type="button"
                key={key}
                aria-pressed={selected}
                minW="74px"
                minH="42px"
                h="auto"
                display="grid"
                gridTemplateColumns="auto auto"
                placeContent="center"
                gap="5px"
                border="0"
                borderRadius="6px"
                bg={selected ? "#e7f3ef" : "transparent"}
                color={selected ? "var(--chakra-colors-green-700)" : "#6d7169"}
                px="12px"
                py="0"
                fontWeight="normal"
                _hover={{
                  bg: selected ? "#e7f3ef" : "#fbfaf7",
                  color: selected ? "var(--chakra-colors-green-700)" : "#171915",
                }}
                css={{
                  "@media (max-width: 620px)": {
                    minWidth: "68px",
                    flex: "1 0 68px",
                  },
                }}
                onClick={() => {
                  setSelectedDayKey(key);
                  setEditingActivityId(null);
                }}
              >
                <Text
                  as="span"
                  fontSize="10px"
                  fontWeight="700"
                  textTransform="uppercase"
                >
                  {weekday}
                </Text>

                <Text
                  as="strong"
                  fontSize="11px"
                  fontWeight="700"
                >
                  {dayNumber}
                </Text>
              </Button>
            );
          })}
        </Box>
      </Box>

      {selectedDay && (
        <Box>
          <Box
            as="section"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <Box
              as="header"
              minH="44px"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap="10px"
              px="14px"
              py="9px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
              bg="#fbfaf7"
            >
              <Text
                as="strong"
                fontSize="13px"
                fontWeight="700"
              >
                {dayLabel(selectedDay[1][0].starts_at)}
              </Text>

              <Text
                as="span"
                color="#6d7169"
                fontSize="10px"
              >
                {selectedDay[1].length} scheduled
              </Text>
            </Box>

            <Stack gap="0">
              {selectedDay[1].map((entry) => {
                if (entry.kind === "meal") {
                  const meal = entry.meal;
                  const mealTitle =
                    meal.title ?? meal.meal_type_name;

                  return (
                    <Grid
                      as="article"
                      key={`meal:${meal.id}`}
                      minH="72px"
                      templateColumns="88px minmax(0, 1fr)"
                      gap="12px"
                      px="14px"
                      py="11px"
                      borderBottomWidth="1px"
                      borderColor="#dddcd5"
                      css={{
                        "&:last-child": {
                          borderBottomWidth: "0",
                        },
                        "@media (max-width: 620px)": {
                          gridTemplateColumns:
                            "72px minmax(0, 1fr)",
                          gap: "10px",
                          padding: "11px 12px",
                        },
                      }}
                    >
                      <Stack gap="2px">
                        <Text
                          as="strong"
                          fontSize="12px"
                          fontWeight="700"
                        >
                          {timeLabel(meal.starts_at)}
                        </Text>

                        <Text
                          as="span"
                          color="#6d7169"
                          fontSize="10px"
                        >
                          to {timeLabel(meal.ends_at)}
                        </Text>
                      </Stack>

                      <Stack
                        minW="0"
                        gap="5px"
                      >
                        <HStack
                          gap="7px"
                          flexWrap="wrap"
                        >
                          <Box
                            as="span"
                            display="inline-flex"
                            alignItems="center"
                            w="fit-content"
                            minH="22px"
                            px="7px"
                            borderWidth="1px"
                            borderColor="#b7ddcf"
                            borderRadius="999px"
                            bg="#e7f3ef"
                            color="var(--chakra-colors-green-700)"
                            fontSize="9px"
                            fontWeight="800"
                            letterSpacing="0.03em"
                          >
                            Meal
                          </Box>

                          <Text
                            as="strong"
                            fontSize="13px"
                            fontWeight="700"
                          >
                            {mealTitle}
                          </Text>

                          <Button
                            type="button"
                            minH="24px"
                            h="24px"
                            border="0"
                            borderRadius="8px"
                            bg="#e7f3ef"
                            px="7px"
                            color="var(--chakra-colors-green-700)"
                            fontSize="9px"
                            fontWeight="800"
                            _hover={{
                              bg: "#cce5dc",
                            }}
                            onClick={() => onOpenMeal(meal)}
                          >
                            Menu
                          </Button>

                          <Button
                            type="button"
                            minH="24px"
                            h="24px"
                            border="0"
                            borderRadius="8px"
                            bg="#e7f3ef"
                            px="7px"
                            color="var(--chakra-colors-green-700)"
                            fontSize="9px"
                            fontWeight="800"
                            _hover={{
                              bg: "#cce5dc",
                            }}
                            onClick={() =>
                              onShowOnMap("dining-hall")
                            }
                          >
                            Map
                          </Button>
                        </HStack>

                        <Text
                          as="span"
                          color="#6d7169"
                          fontSize="11px"
                        >
                          Dining / Kitchen
                        </Text>
                      </Stack>
                    </Grid>
                  );
                }

                const activity = entry.activity;

                const activitySignups = signups.filter(
                  (signup) =>
                    signup.event_activity_id === activity.id,
                );

                const mapTarget = activity.map_place_id;

                return (
                  <Grid
                    as="article"
                    key={`activity:${activity.id}`}
                    minH="72px"
                    templateColumns="88px minmax(0, 1fr)"
                    gap="12px"
                    px="14px"
                    py="11px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                      "@media (max-width: 620px)": {
                        gridTemplateColumns:
                          "72px minmax(0, 1fr)",
                        gap: "10px",
                        padding: "11px 12px",
                      },
                    }}
                  >
                    <Stack gap="2px">
                      <Text
                        as="strong"
                        fontSize="12px"
                        fontWeight="700"
                      >
                        {timeLabel(activity.starts_at)}
                      </Text>

                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="10px"
                      >
                        to {timeLabel(activity.ends_at)}
                      </Text>
                    </Stack>

                    <Stack
                      minW="0"
                      gap="5px"
                    >
                      <HStack
                        gap="7px"
                        flexWrap="wrap"
                      >
                        <Box
                          as="span"
                          display="inline-flex"
                          alignItems="center"
                          w="fit-content"
                          minH="22px"
                          px="7px"
                          borderWidth="1px"
                          borderColor="#dddcd5"
                          borderRadius="999px"
                          bg="#fbfaf7"
                          color="#6d7169"
                          fontSize="9px"
                          fontWeight="800"
                          letterSpacing="0.03em"
                        >
                          Activity
                        </Box>

                        <Text
                          as="strong"
                          fontSize="13px"
                          fontWeight="700"
                        >
                          {activity.activity_name}
                        </Text>

                        {mapTarget && (
                          <Button
                            type="button"
                            minH="24px"
                            h="24px"
                            border="0"
                            borderRadius="8px"
                            bg="#e7f3ef"
                            px="7px"
                            color="var(--chakra-colors-green-700)"
                            fontSize="9px"
                            fontWeight="800"
                            _hover={{
                              bg: "#cce5dc",
                            }}
                            onClick={() =>
                              onShowOnMap(mapTarget)
                            }
                          >
                            Map
                          </Button>
                        )}

                        {activity.capacity && (
                          <Text as="small">
                            {activity.signup_count}/
                            {activity.capacity}
                          </Text>
                        )}
                      </HStack>

                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {activity.area_name}
                      </Text>

                      {attendees.length > 0 && (
                        <Stack gap="7px">
                          <HStack
                            alignItems="center"
                            justifyContent="space-between"
                            gap="10px"
                            color="#6d7169"
                            fontSize="10px"
                          >
                            <Text as="span">
                              {activitySignups.length
                                ? activitySignups
                                    .map(
                                      (signup) =>
                                        signup.member_name,
                                    )
                                    .join(", ")
                                : "No one from your family signed up"}
                            </Text>

                            <Button
                              type="button"
                              minH="26px"
                              h="26px"
                              flex="0 0 auto"
                              border="0"
                              borderRadius="8px"
                              bg="#fbfaf7"
                              px="8px"
                              color="var(--chakra-colors-green-700)"
                              fontSize="10px"
                              fontWeight="750"
                              onClick={() =>
                                setEditingActivityId(
                                  editingActivityId ===
                                    activity.id
                                    ? null
                                    : activity.id,
                                )
                              }
                            >
                              {editingActivityId === activity.id
                                ? "Done"
                                : "Edit family"}
                            </Button>
                          </HStack>

                          {editingActivityId === activity.id && (
                            <HStack
                              pt="2px"
                              gap="7px"
                              flexWrap="wrap"
                            >
                              {attendees.map((attendee) => {
                                const signup =
                                  activitySignups.find(
                                    (item) =>
                                      item.member_attendee_id ===
                                      attendee.id,
                                  ) ?? null;

                                return (
                                  <Button
                                    type="button"
                                    key={attendee.id}
                                    disabled={changesUnavailable}
                                    minH="27px"
                                    h="27px"
                                    display="inline-flex"
                                    alignItems="center"
                                    gap="6px"
                                    borderWidth="1px"
                                    borderColor={
                                      signup
                                        ? "#b7ddcf"
                                        : "#dddcd5"
                                    }
                                    borderRadius="999px"
                                    bg={
                                      signup
                                        ? "#e7f3ef"
                                        : "#ffffff"
                                    }
                                    px="8px"
                                    color={
                                      signup
                                        ? "var(--chakra-colors-green-700)"
                                        : "#171915"
                                    }
                                    fontSize="10px"
                                    fontWeight="700"
                                    onClick={() =>
                                      onToggleSignup(
                                        activity,
                                        attendee,
                                        signup,
                                      )
                                    }
                                  >
                                    {attendee.full_name}
                                    <Text as="span">
                                      {signup ? "✓" : "+"}
                                    </Text>
                                  </Button>
                                );
                              })}
                            </HStack>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Grid>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
