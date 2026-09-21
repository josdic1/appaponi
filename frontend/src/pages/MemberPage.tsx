import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  BedDouble,
  BellRing,
  CalendarDays,
  CalendarRange,
  House,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";

import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import type {
  ActivitySignup,
  EventRegistration,
  MemberAttendee,
} from "@appoponi/shared/schemas/registration";

import type {
  CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

import type {
  EventActivity,
} from "@appoponi/shared/schemas/scheduling";

import type {
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

import {
  addAttendee,
  addSignup,
  loadMemberHome,
  removeAttendee,
  removeSignup,
  updateEventHouseholdLead,
} from "../api/member";

import {
  loadNotifications,
  markNotificationRead,
} from "../api/services";

import { useAuth } from "../hooks/useAuth";
import {
  useOnlineStatus,
} from "../hooks/useOnlineStatus";
import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";
import PageSectionLayout from "../components/PageSectionLayout";
import FamilyItinerary from "./FamilyItinerary";
import MemberCampMap from "./MemberCampMap";
import MemberDirectory from "./MemberDirectory";
import MemberHouseholdPanel from "./MemberHouseholdPanel";
import MemberToday from "./MemberToday";
import MemberServicesPanel from "./MemberServicesPanel";

type EventActivityWithCount =
  EventActivity & {
    signup_count: number;
  };

function memberRoleLabel(
  role:
    | "primary"
    | "adult"
    | "child",
) {
  if (role === "primary") {
    return "Default lead";
  }

  return role.charAt(0).toUpperCase() +
    role.slice(1);
}

export default function MemberPage() {
  const { account, logout } = useAuth();
  const online = useOnlineStatus();

  const [
    usingCachedData,
    setUsingCachedData,
  ] = useState(false);

  const [
    registrations,
    setRegistrations,
  ] = useState<EventRegistration[]>([]);

  const [household, setHousehold] =
    useState<HouseholdMember[]>([]);

  const [attendees, setAttendees] =
    useState<MemberAttendee[]>([]);

  const [activities, setActivities] =
    useState<EventActivityWithCount[]>([]);

  const [signups, setSignups] =
    useState<ActivitySignup[]>([]);

  const [meals, setMeals] =
    useState<EventMeal[]>([]);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [
    activeEventId,
    setActiveEventId,
  ] = useState("");

  const [
    mapFocusTarget,
    setMapFocusTarget,
  ] = useState<CampMapPlaceId | null>(null);

  const [
    mealOpenRequest,
    setMealOpenRequest,
  ] = useState<{
    requestId: number;
    startsAt: string;
  } | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  type MemberHomeData =
    Awaited<
      ReturnType<
        typeof loadMemberHome
      >
    >;

  function applyHome(
    data: MemberHomeData,
  ) {
    setRegistrations(
      data.registrations,
    );
    setHousehold(data.household);
    setAttendees(data.attendees);
    setActivities(data.activities);
    setSignups(data.signups);
    setMeals(data.meals);

    setActiveEventId((current) => {
      if (
        current &&
        data.registrations.some(
          (item) => item.event_id === current,
        )
      ) {
        return current;
      }

      const now = Date.now();
      const sorted = data.registrations
        .slice()
        .sort(
          (a, b) =>
            new Date(a.event_starts_at).getTime() -
            new Date(b.event_starts_at).getTime(),
        );

      const preferred =
        sorted.find((item) => {
          const start = new Date(item.event_starts_at).getTime();
          const end = new Date(item.event_ends_at).getTime();
          return start <= now && end >= now;
        }) ??
        sorted.find(
          (item) => new Date(item.event_starts_at).getTime() > now,
        ) ??
        sorted.at(-1);

      return preferred?.event_id ?? "";
    });
  }

  function cacheKey() {
    return `member-home:${
      account?.username ??
      "unknown"
    }`;
  }

  function noticeCacheKey() {
    return `member-notices:${
      account?.username ??
      "unknown"
    }`;
  }

  async function refreshNotices() {
    try {
      const next =
        await loadNotifications();

      setNotifications(next);

      saveOfflineCache(
        noticeCacheKey(),
        next,
      );
    } catch (err) {
      const cached =
        readOfflineCache<
          NotificationRecord[]
        >(
          noticeCacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        setNotifications(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  async function refresh() {
    try {
      const data =
        await loadMemberHome();

      applyHome(data);

      saveOfflineCache(
        cacheKey(),
        data,
      );

      setUsingCachedData(false);
      setError(null);
    } catch (err) {
      const cached =
        readOfflineCache<MemberHomeData>(
          cacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        applyHome(cached.value);
        setUsingCachedData(true);
        setError(null);
        return;
      }

      throw err;
    }
  }

  useEffect(() => {
    void Promise.all([
      refresh(),
      refreshNotices(),
    ]).catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Appaponi",
      ),
    );
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }

    const updateNotices = () => {
      void refreshNotices().catch(
        () => {},
      );
    };

    window.addEventListener(
      "focus",
      updateNotices,
    );

    const timer =
      window.setInterval(
        updateNotices,
        30_000,
      );

    return () => {
      window.removeEventListener(
        "focus",
        updateNotices,
      );
      window.clearInterval(
        timer,
      );
    };
  }, [
    online,
    account?.username,
  ]);

  const registration =
    useMemo(
      () =>
        registrations.find(
          (item) =>
            item.event_id ===
            activeEventId,
        ) ?? null,
      [
        registrations,
        activeEventId,
      ],
    );

  const eventAttendees =
    attendees.filter(
      (item) =>
        item.event_id ===
        activeEventId,
    );

  const attendeeByMember =
    new Map(
      eventAttendees.map(
        (item) => [
          item.member_id,
          item,
        ],
      ),
    );

  const householdLeadCandidates =
    eventAttendees.filter(
      (item) =>
        item.member_role !==
        "child",
    );

  const eventActivities =
    activities.filter(
      (item) =>
        item.event_id ===
        activeEventId,
    );

  const eventMeals =
    meals.filter(
      (item) =>
        item.event_id ===
        activeEventId,
    );

  const eventActivityIds =
    new Set(
      eventActivities.map(
        (item) => item.id,
      ),
    );

  const eventSignups =
    signups.filter((item) =>
      eventActivityIds.has(
        item.event_activity_id,
      ),
    );

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    try {
      await action();
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  function toggleItinerarySignup(
    activity: EventActivityWithCount,
    attendee: MemberAttendee,
    signup: ActivitySignup | null,
  ) {
    void run(() =>
      signup
        ? removeSignup(signup.id)
        : addSignup(
            Number(activity.id),
            Number(attendee.id),
          ),
    );
  }

  function showOnMap(targetId: CampMapPlaceId) {
    setMapFocusTarget(targetId);

    window.requestAnimationFrame(() => {
      document
        .getElementById("member-map")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }

  function openMealDetails(meal: EventMeal) {
    setMealOpenRequest((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      startsAt: meal.starts_at,
    }));

    window.requestAnimationFrame(() => {
      document
        .getElementById("member-services")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function scrollToMemberSection(targetId: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const unreadNotifications =
    notifications.filter(
      (notice) =>
        !notice.read_at &&
        (notice.event_id === null ||
          notice.event_id === activeEventId),
    );

  async function readNotice(
    notice: NotificationRecord,
  ) {
    if (
      !online ||
      usingCachedData
    ) {
      return;
    }

    try {
      const updated =
        await markNotificationRead(
          notice.id,
        );

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updated.id
                ? updated
                : item,
          ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark notice read",
      );
    }
  }

  const householdDisplayName =
    registrations[0]?.household_name ??
    household[0]?.household_name ??
    account?.username ??
    "Member";

  const memberPageSections = [
    ...(registration
      ? [
          {
            id: "member-today-nav",
            label: "Today",
            icon: CalendarDays,
            targetId: "member-today",
          },
        ]
      : []),
    ...(unreadNotifications.length
      ? [
          {
            id: "member-notices-nav",
            label: "Notices",
            icon: BellRing,
            targetId: "member-priority-notices",
          },
        ]
      : []),
    ...(registration &&
    (eventActivities.length || eventMeals.length)
      ? [
          {
            id: "member-itinerary-nav",
            label: "Itinerary",
            icon: CalendarRange,
            targetId: "member-itinerary",
          },
        ]
      : []),
    ...(registration
      ? [
          {
            id: "member-stay-nav",
            label: "Stay + map",
            icon: BedDouble,
            targetId: "member-stay",
          },
          {
            id: "member-services-nav",
            label: "Food + services",
            icon: UtensilsCrossed,
            targetId: "member-services",
          },
          {
            id: "member-directory-nav",
            label: "Directory",
            icon: UsersRound,
            targetId: "member-directory",
          },
        ]
      : []),
    ...(household.length
      ? [
          {
            id: "member-household-nav",
            label: "Household",
            icon: House,
            targetId: "member-household",
          },
        ]
      : []),
  ];

  return (
    <Box
      minH="100vh"
      bg="#f6f5f1"
    >
      <Box
        as="header"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="4"
        px={{ base: "4", md: "6" }}
        py="3"
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Button
          type="button"
          variant="ghost"
          h="auto"
          p="1"
          aria-label="Appaponi home"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <HStack gap="3">
            <Box
              w="9"
              h="9"
              display="grid"
              placeItems="center"
              borderRadius="md"
              bg="green.700"
              color="white"
              fontWeight="700"
            >
              A
            </Box>

            <Stack
              gap="0"
              alignItems="flex-start"
            >
              <Text fontWeight="700">
                Appaponi
              </Text>

              <Text
                fontSize="xs"
                color="gray.500"
              >
                {householdDisplayName}
              </Text>
            </Stack>
          </HStack>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void logout()}
        >
          Sign out
        </Button>
      </Box>

      <Box
        as="main"
        w="full"
        maxW="1400px"
        mx="auto"
        px={{ base: "4", md: "6" }}
        py={{ base: "5", md: "7" }}
      >
        <PageSectionLayout
          items={memberPageSections}
          label="Member sections"
        >
        <Box minW="0">
        {(!online || usingCachedData) && (
          <Alert.Root
            status="warning"
            mb="4"
          >
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Description>
                Offline · showing the last saved information. Changes are unavailable.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Box mb="5">
          <Text
            as="h1"
            fontSize={{ base: "27px", md: "30px" }}
            lineHeight="1.05"
            letterSpacing="-0.045em"
            fontWeight="700"
          >
            Your stay
          </Text>

          {registrations.length > 1 ? (
            <NativeSelect.Root
              mt="2"
              size="sm"
              w={{ base: "full", md: "320px" }}
            >
              <NativeSelect.Field
                aria-label="Current event"
                value={activeEventId}
                onChange={(event) => {
                  setActiveEventId(
                    event.target.value,
                  );
                  setMapFocusTarget(null);
                }}
              >
                {registrations.map((item) => (
                  <option
                    key={item.id}
                    value={item.event_id}
                  >
                    {item.event_name}
                  </option>
                ))}
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>
          ) : (
            <Text
              mt="7px"
              fontSize="13px"
              lineHeight="1.45"
              color="#6d7169"
            >
              {registration?.event_name ??
                "No upcoming event"}
            </Text>
          )}
        </Box>

        {error && (
          <Alert.Root
            status="error"
            role="alert"
            mb="4"
          >
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Description>
                {error}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {!registration ? (
          <Box
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="white"
            px="5"
            py="8"
            textAlign="center"
          >
            <Text
              fontSize="12px"
              color="#6d7169"
            >
              This household is not registered for an event yet.
            </Text>
          </Box>
        ) : (
          <>
            <MemberToday
              registration={registration}
              activities={eventActivities}
              meals={eventMeals}
              attendees={eventAttendees}
              signups={eventSignups}
              unreadNotifications={unreadNotifications}
              onOpenItinerary={() =>
                scrollToMemberSection(
                  "member-itinerary",
                )
              }
              onOpenMeal={openMealDetails}
              onOpenStay={() =>
                scrollToMemberSection(
                  "member-stay",
                )
              }
              onOpenNotices={() =>
                scrollToMemberSection(
                  unreadNotifications.length
                    ? "member-priority-notices"
                    : "member-services",
                )
              }
            />

            {unreadNotifications.length > 0 && (
              <Box
                as="section"
                id="member-priority-notices"
                aria-label="Unread notices"
                scrollMarginTop={{
                  base: "128px",
                  md: "84px",
                }}
                mb="18px"
                overflow="hidden"
                borderWidth="1px"
                borderColor="#b7ddcf"
                borderRadius="12px"
                bg="#e7f3ef"
              >
                <Box
                  minH="38px"
                  display="flex"
                  alignItems="center"
                  px="13px"
                  py="8px"
                  borderBottomWidth="1px"
                  borderColor="#cce5dc"
                >
                  <Text
                    color="var(--chakra-colors-green-700)"
                    fontSize="10px"
                    fontWeight="800"
                    letterSpacing="0.06em"
                    textTransform="uppercase"
                  >
                    {unreadNotifications.length === 1
                      ? "New notice"
                      : `${unreadNotifications.length} new notices`}
                  </Text>
                </Box>

                <Stack gap="0">
                  {unreadNotifications.map(
                    (notice) => (
                      <Box
                        as="article"
                        key={notice.id}
                        minH="66px"
                        display="flex"
                        flexDirection={{
                          base: "column",
                          sm: "row",
                        }}
                        alignItems={{
                          base: "flex-start",
                          sm: "center",
                        }}
                        justifyContent="space-between"
                        gap="3"
                        px="13px"
                        py="11px"
                        borderBottomWidth="1px"
                        borderColor="#cce5dc"
                      >
                        <Stack
                          minW="0"
                          gap="3px"
                        >
                          <Text fontWeight="700">
                            {notice.title}
                          </Text>

                          <Text
                            fontSize="11px"
                            color="#6d7169"
                          >
                            {notice.body}
                          </Text>

                          <Text
                            fontSize="11px"
                            color="#6d7169"
                          >
                            {new Date(
                              notice.created_at,
                            ).toLocaleString()}
                          </Text>
                        </Stack>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            !online ||
                            usingCachedData
                          }
                          onClick={() =>
                            void readNotice(
                              notice,
                            )
                          }
                        >
                          Mark read
                        </Button>
                      </Box>
                    ),
                  )}
                </Stack>
              </Box>
            )}

            <Box
              id="member-itinerary"
              scrollMarginTop={{
                base: "128px",
                md: "84px",
              }}
            >
              <FamilyItinerary
                activities={eventActivities}
                meals={eventMeals}
                attendees={eventAttendees}
                signups={eventSignups}
                changesUnavailable={
                  !online ||
                  usingCachedData
                }
                onToggleSignup={
                  toggleItinerarySignup
                }
                onShowOnMap={showOnMap}
                onOpenMeal={openMealDetails}
              />
            </Box>

            <Grid
              id="member-stay"
              scrollMarginTop={{
                base: "128px",
                md: "84px",
              }}
              templateColumns={{
                base: "1fr",
                xl: "minmax(270px, .48fr) minmax(0, 1fr)",
              }}
              alignItems="start"
              gap="14px"
              mb="18px"
            >
              <Box
                as="section"
                overflow="hidden"
                borderWidth="1px"
                borderColor="#dddcd5"
                borderRadius="12px"
                bg="white"
              >
                <Box
                  minH="58px"
                  display="flex"
                  alignItems="center"
                  px="4"
                  py="13px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                >
                  <Stack gap="3px">
                    <Text fontWeight="700">
                      Your stay
                    </Text>

                    <Text
                      fontSize="11px"
                      color="#6d7169"
                    >
                      {registration.cabin_name
                        ? `${registration.cabin_name} · ${eventAttendees.length}/${registration.spots_paid_for} attending`
                        : `${eventAttendees.length}/${registration.spots_paid_for} attending · Cabin not assigned`}
                    </Text>
                  </Stack>
                </Box>

                <Stack
                  gap="0"
                  p="6px"
                >
                  {household.map((person) => {
                    const attendee =
                      attendeeByMember.get(
                        person.id,
                      );

                    return (
                      <Button
                        key={person.id}
                        type="button"
                        variant="ghost"
                        w="full"
                        minH="48px"
                        h="auto"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap="3"
                        px="10px"
                        py="8px"
                        borderRadius="0"
                        borderBottomWidth="1px"
                        borderColor="#dddcd5"
                        bg={
                          attendee
                            ? "#e7f3ef"
                            : "transparent"
                        }
                        textAlign="left"
                        disabled={
                          !online ||
                          usingCachedData
                        }
                        onClick={() =>
                          void run(() =>
                            attendee
                              ? removeAttendee(
                                  attendee.id,
                                )
                              : addAttendee(
                                  Number(
                                    person.id,
                                  ),
                                  Number(
                                    registration.event_id,
                                  ),
                                ),
                          )
                        }
                      >
                        <Stack
                          minW="0"
                          gap="2px"
                          alignItems="flex-start"
                        >
                          <Text fontWeight="700">
                            {person.full_name}
                          </Text>

                          <Text
                            fontSize="10px"
                            color="#6d7169"
                          >
                            {memberRoleLabel(
                              person.member_role,
                            )}
                          </Text>
                        </Stack>

                        <Text
                          fontSize="10px"
                          fontWeight="750"
                          color={
                            attendee
                              ? "var(--chakra-colors-green-700)"
                              : "#6d7169"
                          }
                        >
                          {attendee
                            ? "Going"
                            : "Not going"}
                        </Text>
                      </Button>
                    );
                  })}
                </Stack>

                <Grid
                  templateColumns={{
                    base: "1fr",
                    md: "minmax(0, 1fr) auto",
                  }}
                  alignItems="center"
                  gap="3"
                  px="4"
                  py="3"
                  borderTopWidth="1px"
                  borderColor="#dddcd5"
                >
                  <Stack
                    minW="0"
                    gap="1"
                  >
                    <Text fontWeight="700">
                      Household lead
                    </Text>

                    <Text
                      fontSize="11px"
                      color="#6d7169"
                    >
                      Camp&apos;s lead contact for this event. This does not change who can use the shared household login.
                    </Text>
                  </Stack>

                  {householdLeadCandidates.length ? (
                    <NativeSelect.Root
                      size="sm"
                      w={{
                        base: "full",
                        md: "220px",
                      }}
                      disabled={
                        !online ||
                        usingCachedData
                      }
                    >
                      <NativeSelect.Field
                        aria-label="Household lead"
                        value={
                          registration.household_lead_member_id ??
                          ""
                        }
                        onChange={(event) =>
                          void run(() =>
                            updateEventHouseholdLead(
                              Number(
                                registration.event_id,
                              ),
                              Number(
                                event.target.value,
                              ),
                            ),
                          )
                        }
                      >
                        <option
                          value=""
                          disabled
                        >
                          Choose adult
                        </option>

                        {householdLeadCandidates.map(
                          (person) => (
                            <option
                              key={
                                person.member_id
                              }
                              value={
                                person.member_id
                              }
                            >
                              {person.full_name}
                            </option>
                          ),
                        )}
                      </NativeSelect.Field>

                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  ) : (
                    <Badge>
                      Choose an attending adult
                    </Badge>
                  )}
                </Grid>
              </Box>

              <Box
                id="member-map"
                minW="0"
              >
                <MemberCampMap
                  registration={registration}
                  focusTarget={
                    mapFocusTarget
                  }
                />
              </Box>
            </Grid>
          </>
        )}

        <Box
          id="member-services"
          scrollMarginTop={{
            base: "128px",
            md: "84px",
          }}
        >
          <MemberServicesPanel
            activeEventId={activeEventId}
            registration={registration}
            household={household}
            mealOpenRequest={
              mealOpenRequest
            }
          />
        </Box>

        {registration && (
          <Box
            id="member-directory"
            scrollMarginTop={{
              base: "128px",
              md: "84px",
            }}
            mt="18px"
          >
            <MemberDirectory
              eventId={activeEventId}
              cacheIdentity={
                account?.username ??
                "member"
              }
              changesUnavailable={
                !online ||
                usingCachedData
              }
            />
          </Box>
        )}

        <Box
          id="member-household"
          scrollMarginTop={{
            base: "128px",
            md: "84px",
          }}
          mt="26px"
        >
          <MemberHouseholdPanel
            household={household}
            disabled={
              !online ||
              usingCachedData
            }
            onChanged={refresh}
          />
        </Box>
        </Box>
        </PageSectionLayout>
      </Box>
    </Box>
  );
}
