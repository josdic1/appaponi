import {
  useEffect,
  useState,
} from "react";

import {
  Box,
  Button,
  Grid,
  HStack,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";

import type {
  StaffParticipant,
  StaffScheduledActivity,
} from "@appoponi/shared/schemas/staffDay";

import type {
  BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import type {
  FoodOrder,
} from "@appoponi/shared/schemas/foodOrders";

import type {
  StaffMember,
} from "@appoponi/shared/schemas/staffMembers";

import type {
  NotificationPreferences,
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import {
  checkInParticipant,
  loadStaffDay,
} from "../api/staffDay";

import {
  completeAssignedBabysitting,
  fulfillAssignedFoodOrder,
  loadBabysittingRequests,
  loadFoodOrders,
  loadNotificationPreferences,
  loadNotifications,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/services";

import {
  loadStaffMembers,
} from "../api/admin";

import {
  useAuth,
} from "../hooks/useAuth";

import {
  useOnlineStatus,
} from "../hooks/useOnlineStatus";

import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";

import {
  applyStaffOfflineActions,
  enqueueStaffOfflineAction,
  readStaffOfflineQueue,
  saveStaffOfflineQueue,
  type StaffOfflineAction,
} from "../lib/staffOfflineQueue";

import AppSectionStack from "../components/AppSectionStack";

function staffActivityDateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function staffTimeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function staffActivityTimeRange(startsAt: string, endsAt: string) {
  return `${staffActivityDateLabel(startsAt)} · ${staffTimeLabel(startsAt)}–${staffTimeLabel(endsAt)}`;
}

function foodOrderTitle(order: FoodOrder) {
  return order.offering_type === "SNACK"
    ? "Snack pickup"
    : order.fulfillment === "delivery"
      ? "After-hours delivery"
      : "After-hours pickup";
}

function foodOrderItems(order: FoodOrder) {
  return order.items
    .map((item) => `${item.quantity}× ${item.item_name}`)
    .join(" · ");
}

export default function StaffPage() {
  const { account, logout } =
    useAuth();

  const online =
    useOnlineStatus();

  const [
    usingCachedData,
    setUsingCachedData,
  ] = useState(false);

  const [activities, setActivities] =
    useState<StaffScheduledActivity[]>([]);

  const [
    participants,
    setParticipants,
  ] = useState<StaffParticipant[]>([]);

  const [
    babysitting,
    setBabysitting,
  ] = useState<BabysittingRequest[]>([]);

  const [
    foodOrders,
    setFoodOrders,
  ] = useState<FoodOrder[]>([]);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [
    notificationPreferences,
    setNotificationPreferences,
  ] = useState<NotificationPreferences | null>(null);

  const [
    staffProfile,
    setStaffProfile,
  ] = useState<StaffMember | null>(
    null,
  );

  const [error, setError] =
    useState<string | null>(null);

  const [
    pendingActions,
    setPendingActions,
  ] = useState<StaffOfflineAction[]>([]);

  const [syncing, setSyncing] =
    useState(false);

  type StaffDayData =
    Awaited<ReturnType<typeof loadStaffDay>>;

  function cacheKey() {
    return `staff-day:${account?.username ?? "unknown"}`;
  }

  function currentQueue() {
    if (!account?.username) {
      return [];
    }

    return readStaffOfflineQueue(
      account.username,
    );
  }

  function applyStaffDay(
    data: StaffDayData,
  ) {
    const queued =
      currentQueue();

    setPendingActions(queued);

    setActivities(
      data.activities,
    );

    setParticipants(
      applyStaffOfflineActions(
        data.participants,
        queued,
      ),
    );
  }

  function queueParticipantAction(
    signupId: string,
  ) {
    if (!account?.username) {
      return;
    }

    const queued =
      enqueueStaffOfflineAction(
        account.username,
        signupId,
      );

    setPendingActions(queued);

    setParticipants(
      (current) =>
        applyStaffOfflineActions(
          current,
          queued,
        ),
    );
  }

  function profileCacheKey() {
    return `staff-profile:${account?.username ?? "unknown"}`;
  }

  async function refreshProfile() {
    try {
      const profiles =
        await loadStaffMembers();

      const profile =
        profiles.find(
          (item) =>
            item.account_id ===
            account?.id,
        ) ??
        profiles[0] ??
        null;

      setStaffProfile(profile);

      saveOfflineCache(
        profileCacheKey(),
        profile,
      );
    } catch (err) {
      const cached =
        readOfflineCache<StaffMember | null>(
          profileCacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setStaffProfile(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  function babysittingCacheKey() {
    return `staff-babysitting:${account?.username ?? "unknown"}`;
  }

  async function refreshBabysitting() {
    try {
      const next =
        await loadBabysittingRequests();

      setBabysitting(next);

      saveOfflineCache(
        babysittingCacheKey(),
        next,
      );
    } catch (err) {
      const cached =
        readOfflineCache<BabysittingRequest[]>(
          babysittingCacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setBabysitting(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  function foodOrdersCacheKey() {
    return `staff-food-orders:${account?.username ?? "unknown"}`;
  }

  async function refreshFoodOrders() {
    try {
      const next =
        await loadFoodOrders();

      setFoodOrders(next);

      saveOfflineCache(
        foodOrdersCacheKey(),
        next,
      );
    } catch (err) {
      const cached =
        readOfflineCache<FoodOrder[]>(
          foodOrdersCacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setFoodOrders(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  function notificationsCacheKey() {
    return `staff-notifications:${account?.username ?? "unknown"}`;
  }

  async function refreshNotifications() {
    try {
      const [nextNotifications, nextPreferences] =
        await Promise.all([
          loadNotifications(),
          loadNotificationPreferences(),
        ]);

      setNotifications(nextNotifications);
      setNotificationPreferences(nextPreferences);

      saveOfflineCache(
        notificationsCacheKey(),
        {
          notifications: nextNotifications,
          preferences: nextPreferences,
        },
      );
    } catch (err) {
      const cached = readOfflineCache<{
        notifications: NotificationRecord[];
        preferences: NotificationPreferences;
      }>(notificationsCacheKey());

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setNotifications(cached.value.notifications);
        setNotificationPreferences(cached.value.preferences);
        return;
      }

      throw err;
    }
  }

  async function refresh() {
    try {
      const data =
        await loadStaffDay();

      applyStaffDay(data);

      saveOfflineCache(
        cacheKey(),
        data,
      );

      setUsingCachedData(false);
      setError(null);
    } catch (err) {
      const cached =
        readOfflineCache<StaffDayData>(
          cacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        applyStaffDay(
          cached.value,
        );

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
      refreshBabysitting(),
      refreshFoodOrders(),
      refreshProfile(),
      refreshNotifications(),
    ]).catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load staff work",
      ),
    );
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }

    const refreshAll = () => {
      void Promise.all([
        refresh(),
        refreshBabysitting(),
        refreshFoodOrders(),
        refreshProfile(),
        refreshNotifications(),
      ]).catch(() => {});
    };

    window.addEventListener(
      "focus",
      refreshAll,
    );

    const timer =
      window.setInterval(
        refreshAll,
        30_000,
      );

    return () => {
      window.removeEventListener(
        "focus",
        refreshAll,
      );
      window.clearInterval(
        timer,
      );
    };
  }, [
    online,
    account?.username,
  ]);

  async function markParticipantPresent(
    signupId: string,
  ) {
    setError(null);

    if (!online) {
      queueParticipantAction(
        signupId,
      );
      return;
    }

    try {
      await checkInParticipant(
        signupId,
      );

      await refresh();
    } catch (err) {
      if (
        isOfflineFetchFailure(err)
      ) {
        queueParticipantAction(
          signupId,
        );

        setUsingCachedData(true);
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  async function markFoodOrderFulfilled(
    orderId: string,
  ) {
    setError(null);

    if (!online) {
      setError(
        "Connect to mark a food order fulfilled.",
      );
      return;
    }

    try {
      await fulfillAssignedFoodOrder(
        orderId,
      );
      await refreshFoodOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not fulfill food order",
      );
    }
  }

  async function markBabysittingComplete(
    requestId: string,
  ) {
    setError(null);

    if (!online) {
      setError(
        "Connect to complete babysitting.",
      );
      return;
    }

    try {
      await completeAssignedBabysitting(
        requestId,
      );
      await refreshBabysitting();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete babysitting",
      );
    }
  }

  async function readStaffNotice(
    notice: NotificationRecord,
  ) {
    if (!online || notice.read_at) {
      return;
    }

    setError(null);

    try {
      const updated =
        await markNotificationRead(notice.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id
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

  async function changeStaffNotificationPreference(
    key:
      | "activity_reminders"
      | "special_notifications"
      | "general_notifications",
    value: boolean,
  ) {
    if (!online) {
      return;
    }

    setError(null);

    try {
      const updated =
        await updateNotificationPreferences({
          [key]: value,
        });

      setNotificationPreferences(updated);
      await refreshNotifications();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save notification preference",
      );
    }
  }

  async function syncPendingActions() {
    if (
      !online ||
      !account?.username
    ) {
      return;
    }

    let queued =
      readStaffOfflineQueue(
        account.username,
      );

    if (!queued.length) {
      setPendingActions([]);
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      while (
        queued.length &&
        navigator.onLine
      ) {
        const next =
          queued[0];

        await checkInParticipant(
          next.signup_id,
        );

        queued =
          queued.slice(1);

        saveStaffOfflineQueue(
          account.username,
          queued,
        );

        setPendingActions(
          queued,
        );
      }

      if (!queued.length) {
        await refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sync attendance",
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (online) {
      void syncPendingActions();
    }
  }, [
    online,
    account?.username,
  ]);

  const unreadNotifications =
    notifications.filter(
      (notice) => !notice.read_at,
    );

  const now = Date.now();

  const activeActivities =
    activities.filter((activity) => {
      const start = new Date(activity.starts_at).getTime();
      const end = new Date(activity.ends_at).getTime();
      return start <= now && now < end;
    });

  const activeBabysitting =
    babysitting.filter((request) => {
      if (request.status !== "confirmed") {
        return false;
      }

      const start = new Date(request.starts_at).getTime();
      const end = new Date(request.ends_at).getTime();
      return start <= now && now < end;
    });

  const upcomingTimedWork = [
    ...activities
      .filter(
        (activity) =>
          new Date(activity.starts_at).getTime() > now,
      )
      .map((activity) => ({
        key: `activity-${activity.id}`,
        kind: "Activity" as const,
        title: activity.activity_name,
        detail: `${activity.area_name} · ${activity.event_name}`,
        starts_at: activity.starts_at,
        ends_at: activity.ends_at,
      })),
    ...babysitting
      .filter(
        (request) =>
          request.status === "confirmed" &&
          new Date(request.starts_at).getTime() > now,
      )
      .map((request) => ({
        key: `babysitting-${request.id}`,
        kind: "Babysitting" as const,
        title: request.member_names.join(", "),
        detail: request.username,
        starts_at: request.starts_at,
        ends_at: request.ends_at,
      })),
  ].sort(
    (left, right) =>
      new Date(left.starts_at).getTime() -
      new Date(right.starts_at).getTime(),
  );

  const openFoodOrders =
    foodOrders.filter(
      (order) =>
        order.status === "open",
    );

  const babysittingToComplete =
    babysitting.filter(
      (request) =>
        request.status === "confirmed" &&
        new Date(request.ends_at).getTime() <= now,
    );

  const attendanceToFinish =
    activities.flatMap((activity) => {
      if (
        new Date(activity.ends_at).getTime() > now
      ) {
        return [];
      }

      const people =
        participants.filter(
          (person) =>
            person.event_activity_id ===
            activity.id,
        );

      const missing =
        people.filter(
          (person) =>
            !person.checked_in_at,
        ).length;

      return missing > 0
        ? [{ activity, missing }]
        : [];
    });

  const hasBabysitting =
    babysitting.some(
      (request) =>
        request.status !== "cancelled",
    );

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
                Staff ·{" "}
                {staffProfile?.full_name ??
                  account?.username}
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

      <AppSectionStack
        label="Staff sections"
        items={[
          {
            id: "today",
            label: "Today",
            targetId: "staff-today",
          },
          {
            id: "notices",
            label: unreadNotifications.length
              ? `Notices · ${unreadNotifications.length}`
              : "Notices",
            targetId: "staff-notices",
          },
          {
            id: "schedule",
            label: "Schedule",
            targetId: "staff-schedule",
          },
          ...(hasBabysitting
            ? [
                {
                  id: "babysitting",
                  label: "Babysitting",
                  targetId:
                    "staff-babysitting",
                },
              ]
            : []),
        ]}
      />

      <Box
        as="main"
        w="full"
        maxW="1400px"
        mx="auto"
        px={{ base: "4", md: "6" }}
        py={{ base: "5", md: "7" }}
      >
        {(!online ||
          usingCachedData ||
          pendingActions.length > 0 ||
          syncing) && (
          <Box
            position="sticky"
            top="76px"
            zIndex="24"
            mb="16px"
            px="12px"
            py="10px"
            borderWidth="1px"
            borderColor="#e1d4a8"
            borderRadius="8px"
            bg="#fff9e9"
            color="#6a5821"
            fontSize="12px"
            fontWeight="650"
            css={{
              "@media (max-width: 760px)": {
                top: "122px",
              },
            }}
          >
            {syncing
              ? "Syncing attendance…"
              : !online || usingCachedData
                ? "Offline · showing the last saved work. Attendance changes will sync automatically."
                : "Attendance changes are waiting to sync."}

            {pendingActions.length > 0 && (
              <Text
                as="span"
                fontWeight="800"
              >
                {" "}
                {pendingActions.length}{" "}
                pending
              </Text>
            )}
          </Box>
        )}

        <Box
          id="staff-today"
          mb="20px"
          css={{
            scrollMarginTop: "84px",
            "@media (max-width: 760px)": {
              scrollMarginTop: "128px",
            },
          }}
        >
          <Text
            as="h1"
            m="0"
            fontSize={{ base: "27px", md: "30px" }}
            lineHeight="1.05"
            letterSpacing="-0.045em"
            fontWeight="700"
          >
            Today
          </Text>

          <Text
            mt="7px"
            mb="0"
            color="#6d7169"
            fontSize="13px"
            lineHeight="1.45"
          >
            What is happening now, what is next, and what needs your action.
          </Text>
        </Box>

        {error && (
          <Box
            position="sticky"
            top="76px"
            zIndex="24"
            mb="16px"
            px="12px"
            py="10px"
            borderWidth="1px"
            borderColor="transparent"
            borderRadius="8px"
            bg="#fff0ef"
            color="#b63a33"
            fontSize="12px"
            fontWeight="650"
            css={{
              "@media (max-width: 760px)": {
                top: "122px",
              },
            }}
          >
            {error}
          </Box>
        )}

        <Grid
          className="staff-today-grid"
          gridTemplateColumns="repeat(3, minmax(0, 1fr))"
          alignItems="start"
          gap="12px"
          mb="24px"
          css={{
            "@media (max-width: 1050px)": {
              gridTemplateColumns: "1fr",
            },
          }}
        >
          <Box
            as="section"
            minW="0"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <HStack
              minH="58px"
              justifyContent="space-between"
              gap="14px"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Stack
                minW="0"
                gap="3px"
              >
                <Text as="strong">
                  Now
                </Text>

                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                >
                  Active assignments.
                </Text>
              </Stack>

              <Box
                display="inline-flex"
                alignItems="center"
                minH="26px"
                flex="0 0 auto"
                px="9px"
                borderWidth="1px"
                borderColor="#dddcd5"
                borderRadius="999px"
                bg="#fbfaf7"
                color="#6d7169"
                fontSize="11px"
              >
                {activeActivities.length +
                  activeBabysitting.length}
              </Box>
            </HStack>

            {activeActivities.map(
              (activity) => {
                const people =
                  participants.filter(
                    (person) =>
                      person.event_activity_id ===
                      activity.id,
                  );

                const missing =
                  people.filter(
                    (person) =>
                      !person.checked_in_at,
                  ).length;

                return (
                  <Box
                    key={`now-activity-${activity.id}`}
                    minH="72px"
                    display="flex"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    gap="12px"
                    px="14px"
                    py="12px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                      "@media (max-width: 760px)": {
                        flexDirection: "column",
                      },
                    }}
                  >
                    <Stack
                      minW="0"
                      gap="3px"
                    >
                      <Text as="strong">
                        {activity.activity_name}
                      </Text>

                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {staffActivityTimeRange(
                          activity.starts_at,
                          activity.ends_at,
                        )}
                      </Text>

                      <Text
                        as="small"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {activity.area_name}
                        {missing > 0
                          ? ` · ${missing} to mark present`
                          : " · Attendance complete"}
                      </Text>
                    </Stack>

                    <HStack
                      flex="0 0 auto"
                      gap="8px"
                      flexWrap="wrap"
                      css={{
                        "@media (max-width: 760px)": {
                          width: "100%",
                          justifyContent:
                            "space-between",
                        },
                      }}
                    >
                      <Button
                        type="button"
                        minH="34px"
                        borderWidth="1px"
                        borderColor="#dddcd5"
                        borderRadius="8px"
                        bg="#ffffff"
                        px="11px"
                        fontSize="12px"
                        fontWeight="650"
                        _hover={{
                          borderColor:
                            "#c8c7bf",
                          bg: "#fbfaf7",
                        }}
                        onClick={() =>
                          document
                            .getElementById(
                              `staff-activity-${activity.id}`,
                            )
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                        }
                      >
                        Attendance
                      </Button>
                    </HStack>
                  </Box>
                );
              },
            )}

            {activeBabysitting.map(
              (request) => (
                <Box
                  key={`now-babysitting-${request.id}`}
                  minH="72px"
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap="12px"
                  px="14px"
                  py="12px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "&:last-child": {
                      borderBottomWidth: "0",
                    },
                    "@media (max-width: 760px)": {
                      flexDirection: "column",
                    },
                  }}
                >
                  <Stack
                    minW="0"
                    gap="3px"
                  >
                    <Text as="strong">
                      Babysitting ·{" "}
                      {request.member_names.join(
                        ", ",
                      )}
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {staffActivityTimeRange(
                        request.starts_at,
                        request.ends_at,
                      )}
                    </Text>

                    <Text
                      as="small"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {request.username}
                    </Text>
                  </Stack>

                  <Box
                    display="inline-flex"
                    alignItems="center"
                    minH="26px"
                    flex="0 0 auto"
                    px="9px"
                    borderWidth="1px"
                    borderColor="#dddcd5"
                    borderRadius="999px"
                    bg="#fbfaf7"
                    color="#6d7169"
                    fontSize="11px"
                  >
                    {request.status}
                  </Box>
                </Box>
              ),
            )}

            {activeActivities.length ===
              0 &&
              activeBabysitting.length ===
                0 && (
                <Box
                  px="14px"
                  py="16px"
                  color="#6d7169"
                  textAlign="left"
                  fontSize="12px"
                >
                  Nothing assigned right now.
                </Box>
              )}
          </Box>

          <Box
            as="section"
            minW="0"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <HStack
              minH="58px"
              justifyContent="space-between"
              gap="14px"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Stack
                minW="0"
                gap="3px"
              >
                <Text as="strong">
                  Next
                </Text>

                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                >
                  Upcoming timed work.
                </Text>
              </Stack>

              <Box
                display="inline-flex"
                alignItems="center"
                minH="26px"
                px="9px"
                borderWidth="1px"
                borderColor="#dddcd5"
                borderRadius="999px"
                bg="#fbfaf7"
                color="#6d7169"
                fontSize="11px"
              >
                {upcomingTimedWork.length}
              </Box>
            </HStack>

            {upcomingTimedWork.length ? (
              upcomingTimedWork.map(
                (item) => (
                  <Box
                    key={item.key}
                    minH="72px"
                    display="flex"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    gap="12px"
                    px="14px"
                    py="12px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                      "@media (max-width: 760px)": {
                        flexDirection: "column",
                      },
                    }}
                  >
                    <Stack
                      minW="0"
                      gap="3px"
                    >
                      <Text as="strong">
                        {item.title}
                      </Text>

                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {staffActivityTimeRange(
                          item.starts_at,
                          item.ends_at,
                        )}
                      </Text>

                      <Text
                        as="small"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {item.kind} ·{" "}
                        {item.detail}
                      </Text>
                    </Stack>
                  </Box>
                ),
              )
            ) : (
              <Box
                px="14px"
                py="16px"
                color="#6d7169"
                textAlign="left"
                fontSize="12px"
              >
                No upcoming timed work.
              </Box>
            )}
          </Box>

          <Box
            as="section"
            minW="0"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <HStack
              minH="58px"
              justifyContent="space-between"
              gap="14px"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Stack
                minW="0"
                gap="3px"
              >
                <Text as="strong">
                  Needs action
                </Text>

                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                >
                  Work waiting on you.
                </Text>
              </Stack>

              <Box
                display="inline-flex"
                alignItems="center"
                minH="26px"
                px="9px"
                borderWidth="1px"
                borderColor="#dddcd5"
                borderRadius="999px"
                bg="#fbfaf7"
                color="#6d7169"
                fontSize="11px"
              >
                {openFoodOrders.length +
                  babysittingToComplete.length +
                  attendanceToFinish.length}
              </Box>
            </HStack>

            {openFoodOrders.map(
              (order) => (
                <Box
                  key={`food-order-${order.id}`}
                  minH="72px"
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap="12px"
                  px="14px"
                  py="12px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "&:last-child": {
                      borderBottomWidth: "0",
                    },
                    "@media (max-width: 760px)": {
                      flexDirection: "column",
                    },
                  }}
                >
                  <Stack
                    minW="0"
                    gap="3px"
                  >
                    <Text as="strong">
                      {foodOrderTitle(
                        order,
                      )}
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {foodOrderItems(
                        order,
                      )}
                    </Text>

                    <Text
                      as="small"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {order.username}
                      {order.delivery_location
                        ? ` · ${order.delivery_location}`
                        : ""}
                    </Text>
                  </Stack>

                  <HStack
                    flex="0 0 auto"
                    gap="8px"
                    flexWrap="wrap"
                    css={{
                      "@media (max-width: 760px)": {
                        width: "100%",
                        justifyContent:
                          "space-between",
                      },
                    }}
                  >
                    <Button
                      type="button"
                      disabled={!online}
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
                        borderColor:
                          "#005d41",
                        bg: "#005d41",
                      }}
                      _disabled={{
                        cursor: "default",
                        opacity: 0.55,
                      }}
                      onClick={() =>
                        void markFoodOrderFulfilled(
                          order.id,
                        )
                      }
                    >
                      Mark fulfilled
                    </Button>
                  </HStack>
                </Box>
              ),
            )}

            {babysittingToComplete.map(
              (request) => (
                <Box
                  key={`complete-babysitting-${request.id}`}
                  minH="72px"
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap="12px"
                  px="14px"
                  py="12px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "&:last-child": {
                      borderBottomWidth: "0",
                    },
                    "@media (max-width: 760px)": {
                      flexDirection: "column",
                    },
                  }}
                >
                  <Stack
                    minW="0"
                    gap="3px"
                  >
                    <Text as="strong">
                      Complete babysitting
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {request.member_names.join(
                        ", ",
                      )}
                    </Text>

                    <Text
                      as="small"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {staffActivityTimeRange(
                        request.starts_at,
                        request.ends_at,
                      )}{" "}
                      · {request.username}
                    </Text>
                  </Stack>

                  <HStack
                    flex="0 0 auto"
                    gap="8px"
                    flexWrap="wrap"
                    css={{
                      "@media (max-width: 760px)": {
                        width: "100%",
                        justifyContent:
                          "space-between",
                      },
                    }}
                  >
                    <Button
                      type="button"
                      disabled={!online}
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
                        borderColor:
                          "#005d41",
                        bg: "#005d41",
                      }}
                      _disabled={{
                        cursor: "default",
                        opacity: 0.55,
                      }}
                      onClick={() =>
                        void markBabysittingComplete(
                          request.id,
                        )
                      }
                    >
                      Complete
                    </Button>
                  </HStack>
                </Box>
              ),
            )}

            {attendanceToFinish.map(
              ({ activity, missing }) => (
                <Box
                  key={`attendance-${activity.id}`}
                  minH="72px"
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap="12px"
                  px="14px"
                  py="12px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "&:last-child": {
                      borderBottomWidth: "0",
                    },
                    "@media (max-width: 760px)": {
                      flexDirection: "column",
                    },
                  }}
                >
                  <Stack
                    minW="0"
                    gap="3px"
                  >
                    <Text as="strong">
                      {activity.activity_name}
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {missing}{" "}
                      {missing === 1
                        ? "person"
                        : "people"}{" "}
                      still not marked present
                    </Text>

                    <Text
                      as="small"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {staffActivityTimeRange(
                        activity.starts_at,
                        activity.ends_at,
                      )}
                    </Text>
                  </Stack>

                  <HStack
                    flex="0 0 auto"
                    gap="8px"
                    flexWrap="wrap"
                    css={{
                      "@media (max-width: 760px)": {
                        width: "100%",
                        justifyContent:
                          "space-between",
                      },
                    }}
                  >
                    <Button
                      type="button"
                      minH="34px"
                      borderWidth="1px"
                      borderColor="#dddcd5"
                      borderRadius="8px"
                      bg="#ffffff"
                      px="11px"
                      fontSize="12px"
                      fontWeight="650"
                      _hover={{
                        borderColor:
                          "#c8c7bf",
                        bg: "#fbfaf7",
                      }}
                      onClick={() =>
                        document
                          .getElementById(
                            `staff-activity-${activity.id}`,
                          )
                          ?.scrollIntoView({
                            behavior:
                              "smooth",
                            block: "start",
                          })
                      }
                    >
                      Review
                    </Button>
                  </HStack>
                </Box>
              ),
            )}

            {openFoodOrders.length ===
              0 &&
              babysittingToComplete.length ===
                0 &&
              attendanceToFinish.length ===
                0 && (
                <Box
                  px="14px"
                  py="16px"
                  color="#6d7169"
                  textAlign="left"
                  fontSize="12px"
                >
                  Nothing needs action.
                </Box>
              )}
          </Box>
        </Grid>

        <Box
          as="section"
          id="staff-notices"
          mb="16px"
          overflow="hidden"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
          css={{
            scrollMarginTop: "84px",
            "@media (max-width: 760px)": {
              scrollMarginTop: "128px",
            },
          }}
        >
          <HStack
            minH="58px"
            justifyContent="space-between"
            gap="14px"
            px="16px"
            py="13px"
            borderBottomWidth="1px"
            borderColor="#dddcd5"
          >
            <Stack
              minW="0"
              gap="3px"
            >
              <Text as="strong">
                Notices
              </Text>

              <Text
                as="span"
                color="#6d7169"
                fontSize="11px"
              >
                {unreadNotifications.length
                  ? `${unreadNotifications.length} unread`
                  : "You're caught up."}
              </Text>
            </Stack>
          </HStack>

          {notificationPreferences && (
            <Stack
              gap="0"
              px="14px"
              py="6px"
            >
              {([
                [
                  "activity_reminders",
                  "Activity reminders · 30 min before",
                ],
                [
                  "special_notifications",
                  "Special notices",
                ],
                [
                  "general_notifications",
                  "General notices",
                ],
              ] as const).map(
                ([key, label]) => (
                  <HStack
                    as="label"
                    key={key}
                    minH="42px"
                    justifyContent="space-between"
                    gap="14px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    color="#171915"
                    fontSize="12px"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                    }}
                  >
                    <Text
                      as="span"
                      minW="0"
                    >
                      {label}
                    </Text>

                    <chakra.input
                      type="checkbox"
                      disabled={!online}
                      checked={
                        notificationPreferences[
                          key
                        ]
                      }
                      w="16px"
                      h="16px"
                      minH="16px"
                      flex="0 0 auto"
                      m="0"
                      accentColor="#007854"
                      onChange={(event) =>
                        void changeStaffNotificationPreference(
                          key,
                          event.target.checked,
                        )
                      }
                    />
                  </HStack>
                ),
              )}
            </Stack>
          )}

          <Stack gap="0">
            {notifications.length ? (
              notifications.map(
                (notice) => (
                  <Box
                    key={notice.id}
                    minH="64px"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap="12px"
                    px="14px"
                    py="12px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                      "@media (max-width: 760px)": {
                        alignItems:
                          "flex-start",
                        flexDirection:
                          "column",
                      },
                    }}
                  >
                    <Stack
                      minW="0"
                      gap="3px"
                    >
                      <Text as="strong">
                        {notice.title}
                      </Text>

                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {notice.body}
                      </Text>

                      <Text
                        as="small"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {new Date(
                          notice.scheduled_for ??
                            notice.created_at,
                        ).toLocaleString()}
                      </Text>
                    </Stack>

                    <HStack
                      justifyContent="flex-end"
                      gap="8px"
                      flexWrap="wrap"
                      css={{
                        "@media (max-width: 760px)": {
                          width: "100%",
                          justifyContent:
                            "space-between",
                        },
                      }}
                    >
                      {notice.read_at ? (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          minH="26px"
                          px="9px"
                          borderWidth="1px"
                          borderColor="#dddcd5"
                          borderRadius="999px"
                          bg="#fbfaf7"
                          color="#6d7169"
                          fontSize="11px"
                        >
                          Read
                        </Box>
                      ) : (
                        <Button
                          type="button"
                          disabled={!online}
                          minH="34px"
                          borderWidth="1px"
                          borderColor="#dddcd5"
                          borderRadius="8px"
                          bg="#ffffff"
                          px="11px"
                          fontSize="12px"
                          fontWeight="650"
                          _hover={{
                            borderColor:
                              "#c8c7bf",
                            bg: "#fbfaf7",
                          }}
                          _disabled={{
                            cursor:
                              "default",
                            opacity: 0.55,
                          }}
                          onClick={() =>
                            void readStaffNotice(
                              notice,
                            )
                          }
                        >
                          Mark read
                        </Button>
                      )}
                    </HStack>
                  </Box>
                ),
              )
            ) : (
              <Box
                px="14px"
                py="16px"
                color="#6d7169"
                textAlign="left"
                fontSize="12px"
              >
                No notices.
              </Box>
            )}
          </Stack>
        </Box>

        <Box
          id="staff-schedule"
          mt="24px"
          mb="20px"
          css={{
            scrollMarginTop: "84px",
            "@media (max-width: 760px)": {
              scrollMarginTop: "128px",
            },
          }}
        >
          <Text
            as="h2"
            m="0"
            fontSize="22px"
            letterSpacing="-0.03em"
            fontWeight="700"
          >
            Schedule
          </Text>

          <Text
            mt="7px"
            mb="0"
            color="#6d7169"
            fontSize="13px"
            lineHeight="1.45"
          >
            All assigned activities and participant attendance.
          </Text>
        </Box>

        {activities.length ? (
          activities.map((activity) => {
            const people =
              participants.filter(
                (person) =>
                  person.event_activity_id ===
                  activity.id,
              );

            const presentCount =
              people.filter(
                (person) =>
                  person.checked_in_at,
              ).length;

            const attendanceLabel =
              people.length === 0
                ? "No signups"
                : presentCount ===
                    people.length
                  ? `${presentCount}/${people.length} present`
                  : `${people.length - presentCount} to mark present`;

            return (
              <Box
                as="section"
                id={`staff-activity-${activity.id}`}
                key={activity.id}
                mb="12px"
                overflow="hidden"
                borderWidth="1px"
                borderColor="#dddcd5"
                borderRadius="12px"
                bg="#ffffff"
                css={{
                  scrollMarginTop: "84px",
                  "@media (max-width: 760px)": {
                    scrollMarginTop:
                      "128px",
                  },
                }}
              >
                <HStack
                  minH="72px"
                  alignItems="center"
                  justifyContent="space-between"
                  gap="14px"
                  px="16px"
                  py="13px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "@media (max-width: 760px)": {
                      alignItems:
                        "flex-start",
                      flexDirection:
                        "column",
                    },
                  }}
                >
                  <Stack
                    minW="0"
                    gap="3px"
                  >
                    <Text as="strong">
                      {activity.activity_name}
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {staffActivityTimeRange(
                        activity.starts_at,
                        activity.ends_at,
                      )}{" "}
                      · {activity.area_name}
                    </Text>

                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                    >
                      {activity.event_name}
                    </Text>
                  </Stack>

                  <Box
                    display="inline-flex"
                    alignItems="center"
                    minH="26px"
                    flex="0 0 auto"
                    px="9px"
                    borderWidth="1px"
                    borderColor="#dddcd5"
                    borderRadius="999px"
                    bg="#fbfaf7"
                    color="#6d7169"
                    fontSize="11px"
                  >
                    {attendanceLabel}
                  </Box>
                </HStack>

                <Stack gap="0">
                  {people.length ? (
                    people.map((person) => (
                      <Box
                        key={
                          person.signup_id
                        }
                        minH="54px"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap="12px"
                        px="14px"
                        py="8px"
                        borderBottomWidth="1px"
                        borderColor="#dddcd5"
                        css={{
                          "&:last-child": {
                            borderBottomWidth:
                              "0",
                          },
                        }}
                      >
                        <Stack
                          minW="0"
                          gap="3px"
                        >
                          <Text as="strong">
                            {person.member_name}
                          </Text>

                          {pendingActions.some(
                            (item) =>
                              item.signup_id ===
                              person.signup_id,
                          ) && (
                            <Text
                              as="small"
                              color="#6d7169"
                              fontSize="11px"
                            >
                              Pending sync
                            </Text>
                          )}
                        </Stack>

                        <HStack
                          justifyContent="flex-end"
                          gap="8px"
                          flexWrap="wrap"
                        >
                          {!person.checked_in_at ? (
                            <Button
                              type="button"
                              minH="34px"
                              borderWidth="1px"
                              borderColor="#dddcd5"
                              borderRadius="8px"
                              bg="#ffffff"
                              px="11px"
                              fontSize="12px"
                              fontWeight="650"
                              _hover={{
                                borderColor:
                                  "#c8c7bf",
                                bg: "#fbfaf7",
                              }}
                              onClick={() =>
                                void markParticipantPresent(
                                  person.signup_id,
                                )
                              }
                            >
                              Mark present
                            </Button>
                          ) : (
                            <Box
                              display="inline-flex"
                              alignItems="center"
                              minH="26px"
                              px="9px"
                              borderWidth="1px"
                              borderColor="#b7ddcf"
                              borderRadius="999px"
                              bg="#e7f3ef"
                              color="#005d41"
                              fontSize="11px"
                            >
                              Present
                            </Box>
                          )}
                        </HStack>
                      </Box>
                    ))
                  ) : (
                    <Box
                      px="14px"
                      py="16px"
                      color="#6d7169"
                      textAlign="left"
                      fontSize="12px"
                    >
                      No participants signed up.
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          })
        ) : (
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
            No activities assigned.
          </Box>
        )}

        {hasBabysitting && (
          <Box
            as="section"
            id="staff-babysitting"
            mb="12px"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
            css={{
              scrollMarginTop: "84px",
              "@media (max-width: 760px)": {
                scrollMarginTop: "128px",
              },
            }}
          >
            <HStack
              minH="58px"
              justifyContent="space-between"
              gap="14px"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Stack
                minW="0"
                gap="3px"
              >
                <Text as="strong">
                  Babysitting
                </Text>

                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                >
                  All assigned requests.
                </Text>
              </Stack>
            </HStack>

            <Stack gap="0">
              {babysitting
                .filter(
                  (request) =>
                    request.status !==
                    "cancelled",
                )
                .map((request) => (
                  <Box
                    key={request.id}
                    minH="64px"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap="12px"
                    px="14px"
                    py="12px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                      "@media (max-width: 760px)": {
                        alignItems:
                          "flex-start",
                        flexDirection:
                          "column",
                      },
                    }}
                  >
                    <Stack
                      minW="0"
                      gap="3px"
                    >
                      <Text as="strong">
                        {request.member_names.join(
                          ", ",
                        )}
                      </Text>

                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {staffActivityTimeRange(
                          request.starts_at,
                          request.ends_at,
                        )}
                      </Text>

                      <Text
                        as="small"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {request.username}
                        {request.notes
                          ? ` · ${request.notes}`
                          : ""}
                      </Text>
                    </Stack>

                    <HStack
                      justifyContent="flex-end"
                      gap="8px"
                      flexWrap="wrap"
                      css={{
                        "@media (max-width: 760px)": {
                          width: "100%",
                          justifyContent:
                            "space-between",
                        },
                      }}
                    >
                      <Box
                        display="inline-flex"
                        alignItems="center"
                        minH="26px"
                        px="9px"
                        borderWidth="1px"
                        borderColor="#dddcd5"
                        borderRadius="999px"
                        bg="#fbfaf7"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {request.status}
                      </Box>

                      {request.status ===
                        "confirmed" &&
                        new Date(
                          request.ends_at,
                        ).getTime() <= now && (
                          <Button
                            type="button"
                            disabled={!online}
                            minH="34px"
                            borderWidth="1px"
                            borderColor="#dddcd5"
                            borderRadius="8px"
                            bg="#ffffff"
                            px="11px"
                            fontSize="12px"
                            fontWeight="650"
                            _hover={{
                              borderColor:
                                "#c8c7bf",
                              bg: "#fbfaf7",
                            }}
                            _disabled={{
                              cursor:
                                "default",
                              opacity: 0.55,
                            }}
                            onClick={() =>
                              void markBabysittingComplete(
                                request.id,
                              )
                            }
                          >
                            Complete
                          </Button>
                        )}
                    </HStack>
                  </Box>
                ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
