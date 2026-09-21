import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CircleAlert,
  Gauge,
  UsersRound,
} from "lucide-react";

import type {
  EventHqSummary,
  EventRecord,
} from "@appoponi/shared/schemas/events";

import {
  loadEventHq,
  loadEvents,
} from "../api/operations";

import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminSectionHeader,
} from "../components/AdminUi";
import PageSectionLayout from "../components/PageSectionLayout";


type Destination =
  | "operations"
  | "scheduling"
  | "registrations"
  | "meals"
  | "services";

type NavigationOptions = {
  mealId?: string;
};

type AttentionItem = {
  id: string;
  label: string;
  destination: Destination;
  options?: NavigationOptions;
};

type Props = {
  onNavigate: (
    destination: Destination,
    options?: NavigationOptions,
  ) => void;
  activeEventId?: string;
  onActiveEventChange?: (eventId: string) => void;
};

function eventDateRange(
  event: EventRecord,
) {
  const start =
    new Date(event.starts_at);

  const end =
    new Date(event.ends_at);

  const date =
    new Intl.DateTimeFormat(
      undefined,
      {
        month: "short",
        day: "numeric",
      },
    );

  const year =
    new Intl.DateTimeFormat(
      undefined,
      {
        year: "numeric",
      },
    );

  return `${date.format(
    start,
  )}–${date.format(
    end,
  )}, ${year.format(end)}`;
}

function dayLabel(
  value: string,
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      weekday: "long",
      month: "short",
      day: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function timeLabel(
  value: string,
) {
  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function pickDefaultEvent(
  events: EventRecord[],
) {
  const now = Date.now();

  return (
    events.find(
      (event) => {
        const starts =
          new Date(
            event.starts_at,
          ).getTime();

        const ends =
          new Date(
            event.ends_at,
          ).getTime();

        return (
          starts <= now &&
          ends >= now
        );
      },
    ) ??
    events.find(
      (event) =>
        new Date(
          event.starts_at,
        ).getTime() > now,
    ) ??
    events.at(-1) ??
    null
  );
}

export default function AdminEventHqPage({
  onNavigate,
  activeEventId = "",
  onActiveEventChange,
}: Props) {
  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState("");

  const [hq, setHq] =
    useState<EventHqSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadEvents()
      .then((nextEvents) => {
        if (cancelled) {
          return;
        }

        setEvents(nextEvents);

        const selected =
          pickDefaultEvent(
            nextEvents,
          );

        const nextSelectedId =
          activeEventId || selected?.id || "";

        setSelectedEventId(
          nextSelectedId,
        );

        if (nextSelectedId && nextSelectedId !== activeEventId) {
          onActiveEventChange?.(nextSelectedId);
        }

        if (!selected) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load events",
        );

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeEventId && activeEventId !== selectedEventId) {
      setSelectedEventId(activeEventId);
    }
  }, [activeEventId, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setHq(null);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    void loadEventHq(
      selectedEventId,
    )
      .then((nextHq) => {
        if (!cancelled) {
          setHq(nextHq);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load Event HQ",
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
  }, [selectedEventId]);

  const schedulePreview =
    useMemo(
      () => (hq?.schedule ?? []).slice(0, 5),
      [hq],
    );

  const attention =
    useMemo<AttentionItem[]>(() => {
      if (!hq) {
        return [];
      }

      const rows: AttentionItem[] = [];

      const openSpots =
        hq.metrics.paid_spots -
        hq.metrics.people;

      const cabinsMissing =
        hq.metrics.households -
        hq.metrics.cabins_assigned;

      if (openSpots > 0) {
        rows.push({
          id: "guest-spots",
          label: `${openSpots} paid ${
            openSpots === 1
              ? "spot is"
              : "spots are"
          } not assigned to a guest`,
          destination: "registrations",
        });
      }

      if (cabinsMissing > 0) {
        rows.push({
          id: "cabins",
          label: `${cabinsMissing} ${
            cabinsMissing === 1
              ? "household needs"
              : "households need"
          } a cabin`,
          destination: "registrations",
        });
      }

      if (
        hq.metrics
          .unstaffed_activities >
        0
      ) {
        rows.push({
          id: "staffing",
          label: `${hq.metrics.unstaffed_activities} ${
            hq.metrics.unstaffed_activities ===
            1
              ? "activity has"
              : "activities have"
          } no staff assigned`,
          destination: "scheduling",
        });
      }

      if (
        hq.metrics
          .food_services_unready >
        0
      ) {
        const firstUnreadyMeal =
          hq.schedule.find(
            (item) =>
              item.kind === "meal" &&
              item.food_item_count === 0,
          );

        rows.push({
          id: "food",
          label: `${hq.metrics.food_services_unready} ${
            hq.metrics.food_services_unready ===
            1
              ? "food service needs"
              : "food services need"
          } food`,
          destination: "meals",
          ...(firstUnreadyMeal
            ? {
                options: {
                  mealId: firstUnreadyMeal.id,
                },
              }
            : {}),
        });
      }

      if (
        hq.metrics
          .pending_babysitting >
        0
      ) {
        rows.push({
          id: "babysitting",
          label: `${hq.metrics.pending_babysitting} babysitting ${
            hq.metrics.pending_babysitting ===
            1
              ? "request is"
              : "requests are"
          } pending`,
          destination: "services",
        });
      }

      if (
        hq.metrics.open_orders >
        0
      ) {
        rows.push({
          id: "food-orders",
          label: `${hq.metrics.open_orders} food ${
            hq.metrics.open_orders ===
            1
              ? "order is"
              : "orders are"
          } open`,
          destination: "services",
        });
      }

      return rows;
    }, [hq]);

  const pageSections = useMemo(() => {
    if (!hq) {
      return [];
    }

    return [
      {
        id: "event-hq-overview",
        label: "Overview",
        icon: Gauge,
        targetId: "event-hq-overview",
      },
      ...(attention.length
        ? [
            {
              id: "event-hq-attention",
              label: "Attention",
              icon: CircleAlert,
              targetId: "event-hq-attention",
            },
          ]
        : []),
      ...(hq.registrations.length
        ? [
            {
              id: "event-hq-households",
              label: "Households",
              icon: UsersRound,
              targetId: "event-hq-households",
            },
          ]
        : []),
      ...(schedulePreview.length
        ? [
            {
              id: "event-hq-schedule",
              label: "Schedule",
              icon: CalendarDays,
              targetId: "event-hq-schedule",
            },
          ]
        : []),
    ];
  }, [attention.length, hq, schedulePreview.length]);

  return (
    <Box
      as="section"
      className="event-hq"
      w="full"
    >
      <Stack gap="6">
        <AdminPageHeader
          eyebrow="Event HQ"
          title={hq?.event.name ?? "Event HQ"}
          description={
            hq
              ? `${hq.event.event_type_name} · ${eventDateRange(hq.event)}`
              : undefined
          }
          action={
            events.length > 1 ? (
              <Box w={{ base: "full", md: "280px" }}>
                <Text fontSize="sm" fontWeight="600" mb="1">
                  Event
                </Text>

                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={selectedEventId}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSelectedEventId(next);
                      onActiveEventChange?.(next);
                    }}
                  >
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </NativeSelect.Field>

                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            ) : undefined
          }
        />

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

        {loading && !hq ? (
          <Box
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
            p="8"
            textAlign="center"
          >
            <Text color="gray.500">
              Loading Event HQ…
            </Text>
          </Box>
        ) : !hq ? (
          <Box
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="gray.300"
            borderRadius="xl"
            p="10"
            textAlign="center"
          >
            <Stack gap="3" alignItems="center">
              <Heading as="h2" size="lg">
                No event yet
              </Heading>

              <Text color="gray.600">
                Create your first event to start using Event HQ.
              </Text>

              <Button
                type="button"
                colorPalette="green"
                onClick={() =>
                  onNavigate("operations")
                }
              >
                Create event
              </Button>
            </Stack>
          </Box>
        ) : (
          <PageSectionLayout
            items={pageSections}
            label="Event HQ sections"
          >
          <Stack gap="6">
            <SimpleGrid
              id="event-hq-overview"
              scrollMarginTop="96px"
              columns={{
                base: 2,
                lg: 4,
              }}
              gap="4"
            >
              <AdminMetricCard
                label="Guests"
                value={`${hq.metrics.people}/${hq.metrics.paid_spots}`}
                detail="attending / paid"
              />

              <AdminMetricCard
                label="Cabins"
                value={`${hq.metrics.cabins_assigned}/${hq.metrics.households}`}
                detail="households placed"
              />

              <AdminMetricCard
                label="Staffing"
                value={`${Math.max(
                  hq.metrics.activities -
                    hq.metrics.unstaffed_activities,
                  0,
                )}/${hq.metrics.activities}`}
                detail="activities covered"
              />

              <AdminMetricCard
                label="Food"
                value={hq.metrics.meals}
                detail={
                  hq.metrics.meals === 0
                    ? "no food services scheduled"
                    : hq.metrics.food_services_unready === 0
                      ? "services · food ready"
                      : `${hq.metrics.food_services_unready} ${
                          hq.metrics.food_services_unready === 1
                            ? "service needs food"
                            : "services need food"
                        }`
                }
              />
            </SimpleGrid>

            <Grid
              templateColumns={{
                base: "1fr",
                lg: "minmax(0, 1.2fr) minmax(0, 1fr)",
              }}
              gap="5"
              alignItems="start"
            >
              <Box
                id="event-hq-attention"
                scrollMarginTop="96px"
              >
              <AdminSectionCard>
                <AdminSectionHeader
                  title="At a glance"
                  description="What needs attention before or during this event."
                  action={
                    hq.metrics.unread_notices > 0 ? (
                      <Badge colorPalette="gray">
                        {hq.metrics.unread_notices}{" "}
                        {hq.metrics.unread_notices === 1
                          ? "unread by recipient"
                          : "unread by recipients"}
                      </Badge>
                    ) : undefined
                  }
                />

                {attention.length ? (
                  <Stack gap="0">
                    {attention.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        h="auto"
                        borderRadius="0"
                        justifyContent="stretch"
                        px="5"
                        py="4"
                        onClick={() =>
                          onNavigate(
                            item.destination,
                            item.options,
                          )
                        }
                      >
                        <HStack
                          w="full"
                          justifyContent="space-between"
                          gap="4"
                        >
                          <HStack gap="3">
                            <Box
                              w="2"
                              h="2"
                              borderRadius="full"
                              bg="orange.500"
                              flexShrink="0"
                            />

                            <Text
                              fontWeight="600"
                              textAlign="left"
                            >
                              {item.label}
                            </Text>
                          </HStack>

                          <Text
                            fontSize="sm"
                            color="gray.500"
                            fontWeight="500"
                          >
                            Open
                          </Text>
                        </HStack>
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <Box p="6">
                    <Text fontWeight="700">
                      No immediate gaps.
                    </Text>

                    <Text
                      mt="1"
                      fontSize="sm"
                      color="gray.500"
                    >
                      Guest spots, cabins, staffing, meals, and active
                      services are covered.
                    </Text>
                  </Box>
                )}
              </AdminSectionCard>
              </Box>

              <Box
                id="event-hq-households"
                scrollMarginTop="96px"
              >
              <AdminSectionCard>
                <AdminSectionHeader
                  title="Households"
                  description="Registration and cabin snapshot."
                  action={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onNavigate("registrations")
                      }
                    >
                      Manage
                    </Button>
                  }
                />

                <Stack gap="0">
                  {hq.registrations.map(
                    (registration) => (
                      <HStack
                        key={registration.id}
                        justifyContent="space-between"
                        alignItems="center"
                        gap="4"
                        px="5"
                        py="3"
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                      >
                        <Stack gap="0" minW="0">
                          <Text fontWeight="600">
                            {registration.household_name}
                          </Text>

                          <Text
                            fontSize="sm"
                            color="gray.500"
                          >
                            {registration.attendee_count}/
                            {registration.spots_paid_for} attending
                          </Text>
                        </Stack>

                        <Badge
                          colorPalette={
                            registration.cabin_name
                              ? "green"
                              : "orange"
                          }
                        >
                          {registration.cabin_name ??
                            "Needs cabin"}
                        </Badge>
                      </HStack>
                    ),
                  )}
                </Stack>
              </AdminSectionCard>
              </Box>
            </Grid>

            <Box
              id="event-hq-schedule"
              scrollMarginTop="96px"
            >
            <AdminSectionCard>
              <AdminSectionHeader
                title="Schedule preview"
                description="The first few things happening in this event. Open Scheduling for the full calendar."
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onNavigate("scheduling")
                    }
                  >
                    Full schedule
                  </Button>
                }
              />

              {schedulePreview.length ? (
                <Stack gap="0">
                  {schedulePreview.map((item) => (
                    <Grid
                      key={`${item.kind}-${item.id}`}
                      templateColumns={{
                        base: "1fr",
                        md: "150px 90px minmax(0, 1fr) 180px",
                      }}
                      gap="4"
                      alignItems="center"
                      px="5"
                      py="4"
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                    >
                      <Stack gap="0">
                        <Text fontWeight="700">
                          {timeLabel(item.starts_at)}
                        </Text>

                        <Text
                          fontSize="xs"
                          color="gray.500"
                        >
                          {dayLabel(item.starts_at)}
                        </Text>
                      </Stack>

                      <Badge
                        w="fit-content"
                        colorPalette={
                          item.kind === "activity"
                            ? "blue"
                            : "green"
                        }
                      >
                        {item.kind === "activity"
                          ? "Activity"
                          : "Meal"}
                      </Badge>

                      <Stack gap="0">
                        <Text fontWeight="600">
                          {item.title}
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          {item.kind === "activity"
                            ? item.meta
                            : `${item.food_item_count ?? 0} ${
                                item.food_item_count === 1
                                  ? "food"
                                  : "foods"
                              }`}
                        </Text>
                      </Stack>

                      <Stack gap="0">
                        {item.kind === "activity" ? (
                          <>
                            <Text
                              fontSize="sm"
                              fontWeight="600"
                            >
                              {item.signup_count ?? 0} signups
                            </Text>

                            <Text
                              fontSize="xs"
                              color="gray.500"
                            >
                              {item.staff_names.length
                                ? item.staff_names.join(", ")
                                : "No staff"}
                            </Text>
                          </>
                        ) : (
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                          >
                            {(item.food_item_count ?? 0) > 0
                              ? "Food ready"
                              : "Needs food"}
                          </Text>
                        )}
                      </Stack>
                    </Grid>
                  ))}
                </Stack>
              ) : (
                <Box p="6">
                  <Text color="gray.500">
                    Nothing scheduled yet.
                  </Text>
                </Box>
              )}
            </AdminSectionCard>
            </Box>
          </Stack>
          </PageSectionLayout>
        )}
      </Stack>
    </Box>
  );
}
