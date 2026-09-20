import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Box,
  Button,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  chakra,
} from "@chakra-ui/react";

import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

import type {
  FoodOffering,
  FoodOfferingType,
  FoodOrder,
} from "@appoponi/shared/schemas/foodOrders";

import type {
  BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import type {
  NotificationPreferences,
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import {
  cancelFoodOrder,
  cancelBabysittingRequest,
  createFoodOrder,
  createBabysittingRequest,
  loadFoodOfferings,
  loadFoodOrders,
  loadBabysittingRequests,
  loadEventMeals,
  loadNotificationPreferences,
  loadNotifications,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/services";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import { useAuth } from "../hooks/useAuth";
import {
  useOnlineStatus,
} from "../hooks/useOnlineStatus";
import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

type View =
  | "meals"
  | "snacks"
  | "after-hours"
  | "babysitting"
  | "notices";

function localDayKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

type MemberServicesData = {
  meals: EventMeal[];
  items: FoodOffering[];
  orders: FoodOrder[];
  babysitting: BabysittingRequest[];
  preferences: NotificationPreferences;
  notifications: NotificationRecord[];
};

type MealOpenRequest = {
  requestId: number;
  startsAt: string;
};

type Props = {
  activeEventId?: string;
  registration: EventRegistration | null;
  household: HouseholdMember[];
  mealOpenRequest?: MealOpenRequest | null;
};

export default function MemberServicesPanel({
  activeEventId = "",
  registration,
  household,
  mealOpenRequest = null,
}: Props) {
  const { account } = useAuth();
  const online = useOnlineStatus();

  const [
    usingCachedData,
    setUsingCachedData,
  ] = useState(false);
  const [view, setView] =
    useState<View>("meals");

  const [meals, setMeals] =
    useState<EventMeal[]>([]);

  const [items, setItems] =
    useState<FoodOffering[]>([]);

  const [orders, setOrders] =
    useState<FoodOrder[]>([]);

  const [
    babysitting,
    setBabysitting,
  ] = useState<BabysittingRequest[]>([]);

  const [
    preferences,
    setPreferences,
  ] =
    useState<NotificationPreferences | null>(
      null,
    );

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [requesterId, setRequesterId] =
    useState("");

  const [foodItemId, setFoodItemId] =
    useState("");

  const [showFoodOrder, setShowFoodOrder] =
    useState(false);

  const [quantity, setQuantity] =
    useState("1");

  const [mealDay, setMealDay] =
    useState("");

  const [
    fulfillment,
    setFulfillment,
  ] =
    useState<
      "pickup" | "delivery"
    >("pickup");

  const [
    deliveryLocation,
    setDeliveryLocation,
  ] = useState("");

  const [
    babysittingMembers,
    setBabysittingMembers,
  ] = useState<string[]>([]);

  const [babyStart, setBabyStart] =
    useState("");

  const [babyEnd, setBabyEnd] =
    useState("");

  const [babyNotes, setBabyNotes] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  function cacheKey() {
    return `member-services:${
      account?.username ??
      "unknown"
    }:${activeEventId || "none"}`;
  }

  function applyServices(
    data: MemberServicesData,
  ) {
    setMeals(data.meals);
    setItems(data.items);
    setOrders(data.orders);
    setBabysitting(
      data.babysitting,
    );
    setPreferences(
      data.preferences,
    );
    setNotifications(
      data.notifications,
    );
  }

  async function refresh() {
    try {
      const [
        nextMeals,
        nextItems,
        nextOrders,
        nextBabysitting,
        nextPreferences,
        nextNotifications,
      ] = await Promise.all([
        activeEventId ? loadEventMeals(activeEventId) : Promise.resolve([]),
        activeEventId ? loadFoodOfferings(activeEventId) : Promise.resolve([]),
        activeEventId ? loadFoodOrders(activeEventId) : Promise.resolve([]),
        activeEventId ? loadBabysittingRequests(activeEventId) : Promise.resolve([]),
        loadNotificationPreferences(),
        loadNotifications(),
      ]);

      const data: MemberServicesData =
        {
          meals: nextMeals,
          items: nextItems,
          orders: nextOrders,
          babysitting:
            nextBabysitting,
          preferences:
            nextPreferences,
          notifications:
            nextNotifications,
        };

      applyServices(data);

      saveOfflineCache(
        cacheKey(),
        data,
      );

      setUsingCachedData(false);
      setError(null);
    } catch (err) {
      const cached =
        readOfflineCache<MemberServicesData>(
          cacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        applyServices(
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
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load services",
      ),
    );
  }, [activeEventId]);

  useEffect(() => {
    if (
      online &&
      usingCachedData
    ) {
      void refresh().catch(
        (err) =>
          setError(
            err instanceof Error
              ? err.message
              : "Could not refresh services",
          ),
      );
    }
  }, [
    online,
    usingCachedData,
  ]);

  useEffect(() => {
    setRequesterId("");
    setFoodItemId("");
    setShowFoodOrder(false);
    setQuantity("1");
    setFulfillment("pickup");
    setDeliveryLocation("");
    setBabysittingMembers([]);
    setBabyStart("");
    setBabyEnd("");
    setBabyNotes("");
    setMealDay("");
  }, [activeEventId]);

  useEffect(() => {
    if (view !== "snacks" && view !== "after-hours") return;
    setFoodItemId("");
    setQuantity("1");
    setDeliveryLocation("");
    if (view === "snacks") setFulfillment("pickup");
  }, [view]);

  const eventMeals = registration ? meals : [];

  const selectedOfferingType: FoodOfferingType =
    view === "snacks" ? "SNACK" : "AFTER_HOURS";

  const eventFoodOfferings =
    registration
      ? items.filter(
          (item) =>
            item.offering_type === selectedOfferingType &&
            item.available,
        )
      : [];

  const eventFoodOrders = registration
    ? orders.filter(
        (order) => order.offering_type === selectedOfferingType,
      )
    : [];

  const eventBabysitting = registration ? babysitting : [];

  const eventNotifications = registration
    ? notifications.filter((notice) =>
        notice.event_id === null || notice.event_id === registration.event_id,
      )
    : notifications.filter((notice) => notice.event_id === null);

  const selectedFoodOffering =
    eventFoodOfferings.find((item) => item.item_id === foodItemId) ?? null;

  const mealDays = Array.from(
    new Map(
      eventMeals.map((meal) => {
        const date = new Date(meal.starts_at);
        return [localDayKey(meal.starts_at), date] as const;
      }),
    ).entries(),
  ).sort((a, b) => a[1].getTime() - b[1].getTime());

  const selectedMealDay =
    mealDays.some(([key]) => key === mealDay)
      ? mealDay
      : mealDays[0]?.[0] ?? "";

  const visibleMeals = eventMeals
    .filter((meal) => {
      return localDayKey(meal.starts_at) === selectedMealDay;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() -
        new Date(b.starts_at).getTime(),
    );

  useEffect(() => {
    if (!mealDays.length) {
      setMealDay("");
      return;
    }

    const today = localDayKey(new Date().toISOString());

    setMealDay((current) => {
      if (mealDays.some(([key]) => key === current)) {
        return current;
      }

      if (mealDays.some(([key]) => key === today)) {
        return today;
      }

      return mealDays[0][0];
    });
  }, [registration?.event_id, eventMeals.length]);

  useEffect(() => {
    if (!mealOpenRequest) {
      return;
    }

    setView("meals");
    setMealDay(localDayKey(mealOpenRequest.startsAt));
  }, [mealOpenRequest]);

  const changesUnavailable =
    !online ||
    usingCachedData;

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    if (changesUnavailable) {
      setError(
        "Reconnect to make changes.",
      );
      return;
    }

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

  function submitFood(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !registration ||
      !foodItemId
    ) {
      setError(
        "Choose an event and food item.",
      );
      return;
    }

    void run(async () => {
      await createFoodOrder({
        event_registration_id:
          Number(registration.id),
        requested_by_member_id:
          requesterId
            ? Number(requesterId)
            : null,
        offering_type: selectedOfferingType,
        fulfillment: selectedOfferingType === "SNACK" ? "pickup" : fulfillment,
        delivery_location:
          selectedOfferingType === "AFTER_HOURS" && fulfillment ===
            "delivery"
            ? deliveryLocation
            : undefined,
        items: [
          {
            item_id:
              Number(foodItemId),
            quantity:
              Number(quantity),
          },
        ],
      });

      setFoodItemId("");
      setQuantity("1");
      setDeliveryLocation("");
      setShowFoodOrder(false);
    });
  }

  function toggleBabyMember(
    id: string,
  ) {
    setBabysittingMembers(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id,
            )
          : [...current, id],
    );
  }

  function submitBabysitting(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !registration ||
      !babyStart ||
      !babyEnd ||
      !babysittingMembers.length
    ) {
      setError(
        "Choose people, start, and end.",
      );
      return;
    }

    void run(async () => {
      await createBabysittingRequest({
        event_registration_id:
          Number(registration.id),
        starts_at:
          humanDateTimeToIso(
            babyStart,
          ),
        ends_at:
          humanDateTimeToIso(
            babyEnd,
            babyStart,
          ),
        notes:
          babyNotes || undefined,
        member_ids:
          babysittingMembers.map(
            Number,
          ),
      });

      setBabysittingMembers([]);
      setBabyStart("");
      setBabyEnd("");
      setBabyNotes("");
    });
  }

  async function changePreference(
    key:
      | "activity_reminders"
      | "meal_reminders"
      | "special_notifications"
      | "general_notifications",
    value: boolean,
  ) {
    if (changesUnavailable) {
      setError(
        "Reconnect to make changes.",
      );
      return;
    }

    try {
      const next =
        await updateNotificationPreferences(
          {
            [key]: value,
          },
        );

      setPreferences(next);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save preferences",
      );
    }
  }

  return (
    <Box
      as="section"
      mt="18px"
    >
      <Box
        display="flex"
        alignItems="flex-end"
        justifyContent="space-between"
        gap="12px"
        mb="20px"
        css={{
          "@media (max-width: 760px)": {
            alignItems: "stretch",
            flexDirection: "column",
          },
        }}
      >
        <Stack gap="3px">
          <Text
            as="h2"
            m="0"
            fontSize="22px"
            fontWeight="700"
            letterSpacing="-0.03em"
          >
            Food &amp; services
          </Text>

          {registration && (
            <Text
              as="span"
              color="#6d7169"
              fontSize="11px"
            >
              {registration.event_name}
            </Text>
          )}
        </Stack>
      </Box>

      <HStack
        role="tablist"
        aria-label="Food and services"
        gap="8px"
        mb="18px"
        overflowX="auto"
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        {([
          ["meals", "Meals"],
          ["snacks", "Snacks"],
          ["after-hours", "After-hours"],
          ["babysitting", "Babysitting"],
          ["notices", "Notices"],
        ] as const).map(([key, label]) => {
          const active = view === key;

          return (
            <Button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              minH="34px"
              h="34px"
              flex="0 0 auto"
              borderWidth="1px"
              borderColor={
                active
                  ? "#b7ddcf"
                  : "#dddcd5"
              }
              borderRadius="8px"
              bg={
                active
                  ? "#e7f3ef"
                  : "#ffffff"
              }
              px="12px"
              color={
                active
                  ? "var(--chakra-colors-green-700)"
                  : "#6d7169"
              }
              fontSize="12px"
              fontWeight="650"
              _hover={{
                borderColor: active
                  ? "#b7ddcf"
                  : "#c8c7bf",
                color: active
                  ? "var(--chakra-colors-green-700)"
                  : "#171915",
              }}
              onClick={() => setView(key)}
            >
              {label}
            </Button>
          );
        })}
      </HStack>

      {(!online || usingCachedData) && (
        <Box
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
        >
          Offline · showing the last saved food, services, and
          notices. Changes are unavailable.
        </Box>
      )}

      {error && (
        <Box
          role="alert"
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
        >
          {error}
        </Box>
      )}

      {view === "meals" && (
        <Box
          as="section"
          mb="16px"
          overflow="hidden"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
        >
          <Box
            minH="58px"
            display="flex"
            alignItems="center"
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
                Meals
              </Text>

              <Text
                color="#6d7169"
                fontSize="11px"
              >
                What is being served, one day at a time.
              </Text>
            </Stack>
          </Box>

          {mealDays.length > 0 && (
            <HStack
              aria-label="Meal day"
              minW="0"
              gap="4px"
              overflowX="auto"
              px="12px"
              py="8px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
              bg="#fbfaf7"
              css={{
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
                },
              }}
            >
              {mealDays.map(([key, date]) => {
                const today = localDayKey(
                  new Date().toISOString(),
                );
                const active =
                  selectedMealDay === key;

                return (
                  <Button
                    key={key}
                    type="button"
                    minW="72px"
                    minH="48px"
                    h="auto"
                    display="block"
                    flex="0 0 auto"
                    borderWidth="1px"
                    borderColor={
                      active
                        ? "#9ccfbd"
                        : "#dddcd5"
                    }
                    borderRadius="8px"
                    bg={
                      active
                        ? "#e7f3ef"
                        : "#ffffff"
                    }
                    px="10px"
                    py="6px"
                    color={
                      active
                        ? "var(--chakra-colors-green-700)"
                        : "#6d7169"
                    }
                    css={{
                      "@media (max-width: 640px)": {
                        minWidth: "62px",
                      },
                    }}
                    onClick={() =>
                      setMealDay(key)
                    }
                  >
                    <Text
                      as="span"
                      display="block"
                      fontSize="10px"
                      fontWeight="750"
                      letterSpacing="0.05em"
                      textTransform="uppercase"
                    >
                      {date.toLocaleDateString([], {
                        weekday: "short",
                      })}
                    </Text>

                    <Text
                      as="strong"
                      display="block"
                      mt="1px"
                      color="#171915"
                      fontSize="15px"
                    >
                      {date.getDate()}
                    </Text>

                    {key === today && (
                      <Text
                        as="small"
                        display="block"
                        mt="1px"
                        color="var(--chakra-colors-green-700)"
                        fontSize="9px"
                        fontWeight="750"
                      >
                        Today
                      </Text>
                    )}
                  </Button>
                );
              })}
            </HStack>
          )}

          {visibleMeals.length ? (
            <Grid>
              {visibleMeals.map((meal) => (
                <Grid
                  as="article"
                  key={meal.id}
                  templateColumns="78px minmax(0, 1fr)"
                  gap="10px"
                  px="14px"
                  py="12px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "&:last-child": {
                      borderBottomWidth: "0",
                    },
                    "@media (max-width: 640px)": {
                      gridTemplateColumns:
                        "66px minmax(0, 1fr)",
                    },
                  }}
                >
                  <Text
                    as="time"
                    fontWeight="800"
                  >
                    {new Date(
                      meal.starts_at,
                    ).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>

                  <Box>
                    <Text
                      as="strong"
                      display="block"
                    >
                      {meal.title ??
                        meal.meal_type_name}
                    </Text>

                    <Text
                      as="p"
                      display="block"
                      mt="4px"
                      mb="0"
                      color="#6d7169"
                      fontSize="12px"
                      lineHeight="1.45"
                    >
                      {meal.items.length
                        ? meal.items
                            .map(
                              (item) =>
                                item.name,
                            )
                            .join(" · ")
                        : "Menu not set yet."}
                    </Text>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box
              px="20px"
              py="32px"
              color="#6d7169"
              textAlign="center"
              fontSize="12px"
            >
              No meals scheduled for this day.
            </Box>
          )}
        </Box>
      )}

      {(view === "snacks" ||
        view === "after-hours") && (
        <Box
          as="section"
          mb="16px"
          overflow="hidden"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
        >
          <Box
            minH="58px"
            display="flex"
            alignItems="center"
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
                {selectedOfferingType === "SNACK"
                  ? "Snacks"
                  : "After-hours food"}
              </Text>

              <Text
                color="#6d7169"
                fontSize="11px"
              >
                {selectedOfferingType === "SNACK"
                  ? "Tap an available snack to request pickup."
                  : "Tap an available item to order pickup or delivery."}
              </Text>
            </Stack>
          </Box>

          <Grid
            templateColumns="repeat(2, minmax(0, 1fr))"
            css={{
              "@media (max-width: 640px)": {
                gridTemplateColumns: "1fr",
              },
            }}
          >
            {eventFoodOfferings.length ? (
              eventFoodOfferings.map(
                (item, index) => {
                  const selected =
                    showFoodOrder &&
                    foodItemId ===
                      item.item_id;

                  return (
                    <Button
                      type="button"
                      key={item.id}
                      minH="64px"
                      h="auto"
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      gap="12px"
                      border="0"
                      borderRightWidth={
                        index % 2 === 0
                          ? "1px"
                          : "0"
                      }
                      borderBottomWidth="1px"
                      borderColor="#dddcd5"
                      borderRadius="0"
                      bg={
                        selected
                          ? "#e7f3ef"
                          : "#ffffff"
                      }
                      px="14px"
                      py="11px"
                      color="#171915"
                      textAlign="left"
                      _hover={{
                        bg: "#e7f3ef",
                      }}
                      css={{
                        "@media (max-width: 640px)": {
                          borderRightWidth: "0",
                        },
                      }}
                      onClick={() => {
                        setFoodItemId(
                          item.item_id,
                        );
                        setShowFoodOrder(
                          true,
                        );
                      }}
                    >
                      <Stack
                        minW="0"
                        gap="3px"
                        alignItems="flex-start"
                      >
                        <Text
                          as="strong"
                          fontWeight="700"
                        >
                          {item.name}
                        </Text>

                        <Text
                          as="small"
                          color="#6d7169"
                          fontSize="10px"
                        >
                          {item.description ??
                            (selectedOfferingType ===
                            "SNACK"
                              ? "Pickup"
                              : "After-hours")}
                        </Text>
                      </Stack>

                      <Text
                        as="b"
                        flex="0 0 auto"
                        color="var(--chakra-colors-green-700)"
                        fontSize="10px"
                      >
                        Choose
                      </Text>
                    </Button>
                  );
                },
              )
            ) : (
              <Box
                gridColumn="1 / -1"
                px="20px"
                py="32px"
                color="#6d7169"
                textAlign="center"
                fontSize="12px"
              >
                {selectedOfferingType === "SNACK"
                  ? "No snacks are currently offered."
                  : "No after-hours items are currently offered."}
              </Box>
            )}
          </Grid>

          {showFoodOrder &&
            selectedFoodOffering && (
              <Grid
                as="form"
                onSubmit={submitFood}
                templateColumns="repeat(2, minmax(0, 1fr))"
                gap="12px"
                m="0"
                p="12px"
                borderTopWidth="1px"
                borderBottomWidth="1px"
                borderColor="#dddcd5"
                bg="#fbfaf7"
                css={{
                  "@media (max-width: 640px)": {
                    gridTemplateColumns: "1fr",
                  },
                }}
              >
                <Grid
                  gridColumn="1 / -1"
                  templateColumns="auto minmax(0, 1fr) auto"
                  alignItems="center"
                  gap="10px"
                  pb="10px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "@media (max-width: 640px)": {
                      gridColumn: "1",
                      gridTemplateColumns:
                        "1fr auto",
                    },
                  }}
                >
                  <Text
                    as="span"
                    color="#6d7169"
                    fontSize="10px"
                    fontWeight="750"
                    textTransform="uppercase"
                    css={{
                      "@media (max-width: 640px)": {
                        gridColumn: "1 / -1",
                      },
                    }}
                  >
                    Selected
                  </Text>

                  <Text as="strong">
                    {selectedFoodOffering.name}
                  </Text>

                  <Button
                    type="button"
                    minH="34px"
                    h="34px"
                    borderWidth="1px"
                    borderColor="#dddcd5"
                    borderRadius="8px"
                    bg="#ffffff"
                    px="11px"
                    color="#171915"
                    fontSize="12px"
                    fontWeight="650"
                    _hover={{
                      borderColor: "#c8c7bf",
                      bg: "#fbfaf7",
                    }}
                    onClick={() => {
                      setShowFoodOrder(false);
                      setFoodItemId("");
                    }}
                  >
                    Change
                  </Button>
                </Grid>

                <Stack
                  as="label"
                  gap="6px"
                  minW="0"
                >
                  <Text
                    as="span"
                    color="#6d7169"
                    fontSize="11px"
                    fontWeight="700"
                  >
                    For
                  </Text>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={requesterId}
                      minH="40px"
                      borderColor="#c8c7bf"
                      borderRadius="8px"
                      bg="#ffffff"
                      onChange={(e) =>
                        setRequesterId(
                          e.target.value,
                        )
                      }
                    >
                      <option value="">
                        Household
                      </option>

                      {household.map(
                        (person) => (
                          <option
                            key={person.id}
                            value={person.id}
                          >
                            {person.full_name}
                          </option>
                        ),
                      )}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Stack>

                <Stack
                  as="label"
                  gap="6px"
                  minW="0"
                >
                  <Text
                    as="span"
                    color="#6d7169"
                    fontSize="11px"
                    fontWeight="700"
                  >
                    Quantity
                  </Text>

                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    w="96px"
                    maxW="100%"
                    minH="40px"
                    borderColor="#c8c7bf"
                    borderRadius="8px"
                    bg="#ffffff"
                    px="11px"
                    _focus={{
                      borderColor: "var(--chakra-colors-green-600)",
                      boxShadow:
                        "0 0 0 3px #e7f3ef",
                    }}
                    onChange={(e) =>
                      setQuantity(
                        e.target.value,
                      )
                    }
                  />
                </Stack>

                {selectedOfferingType ===
                  "AFTER_HOURS" && (
                  <Stack
                    as="label"
                    gap="6px"
                    minW="0"
                  >
                    <Text
                      as="span"
                      color="#6d7169"
                      fontSize="11px"
                      fontWeight="700"
                    >
                      How
                    </Text>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={fulfillment}
                        minH="40px"
                        borderColor="#c8c7bf"
                        borderRadius="8px"
                        bg="#ffffff"
                        onChange={(e) =>
                          setFulfillment(
                            e.target.value as
                              | "pickup"
                              | "delivery",
                          )
                        }
                      >
                        <option value="pickup">
                          Pickup
                        </option>
                        <option value="delivery">
                          Delivery
                        </option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Stack>
                )}

                {selectedOfferingType ===
                  "AFTER_HOURS" &&
                  fulfillment ===
                    "delivery" && (
                    <Stack
                      as="label"
                      gridColumn="1 / -1"
                      gap="6px"
                      minW="0"
                      css={{
                        "@media (max-width: 640px)": {
                          gridColumn: "1",
                        },
                      }}
                    >
                      <Text
                        as="span"
                        color="#6d7169"
                        fontSize="11px"
                        fontWeight="700"
                      >
                        Delivery location
                      </Text>

                      <Input
                        value={
                          deliveryLocation
                        }
                        minH="40px"
                        borderColor="#c8c7bf"
                        borderRadius="8px"
                        bg="#ffffff"
                        px="11px"
                        _focus={{
                          borderColor:
                            "var(--chakra-colors-green-600)",
                          boxShadow:
                            "0 0 0 3px #e7f3ef",
                        }}
                        onChange={(e) =>
                          setDeliveryLocation(
                            e.target.value,
                          )
                        }
                      />
                    </Stack>
                  )}

                <HStack
                  gridColumn="1 / -1"
                  justifyContent="flex-end"
                  gap="8px"
                  css={{
                    "@media (max-width: 640px)": {
                      gridColumn: "1",
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
                      borderColor: "#c8c7bf",
                      bg: "#fbfaf7",
                    }}
                    onClick={() => {
                      setShowFoodOrder(false);
                      setFoodItemId("");
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={changesUnavailable}
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
                    {selectedOfferingType ===
                    "SNACK"
                      ? "Request pickup"
                      : "Place order"}
                  </Button>
                </HStack>
              </Grid>
            )}

          {eventFoodOrders.length > 0 && (
            <Box
              borderTopWidth="1px"
              borderColor="#dddcd5"
            >
              <Box
                px="14px"
                py="9px"
                borderBottomWidth="1px"
                borderColor="#dddcd5"
                bg="#fbfaf7"
                color="#6d7169"
                fontSize="10px"
                fontWeight="800"
                letterSpacing="0.05em"
                textTransform="uppercase"
              >
                Your requests
              </Box>

              {eventFoodOrders.map(
                (order) => (
                  <Box
                    key={order.id}
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
                      "@media (max-width: 620px)": {
                        alignItems:
                          "flex-start",
                        flexDirection:
                          "column",
                      },
                    }}
                  >
                    <Stack gap="3px">
                      <Text as="strong">
                        {order.items
                          .map(
                            (item) =>
                              `${item.quantity}× ${item.item_name}`,
                          )
                          .join(" · ")}
                      </Text>

                      <Text
                        as="small"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {order.fulfillment}
                        {order.delivery_location
                          ? ` · ${order.delivery_location}`
                          : ""}
                      </Text>
                    </Stack>

                    <HStack
                      gap="8px"
                      flexWrap="wrap"
                    >
                      <Text
                        as="b"
                        textTransform="capitalize"
                      >
                        {order.status}
                      </Text>

                      {order.status ===
                        "open" && (
                        <Button
                          type="button"
                          disabled={
                            changesUnavailable
                          }
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
                            void run(() =>
                              cancelFoodOrder(
                                order.id,
                              ),
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </HStack>
                  </Box>
                ),
              )}
            </Box>
          )}
        </Box>
      )}

      {view === "babysitting" && (
        <>
          <Box
            as="section"
            mb="16px"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <Box
              minH="58px"
              display="flex"
              alignItems="center"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Text as="strong">
                Request babysitting
              </Text>
            </Box>

            <Grid
              as="form"
              onSubmit={submitBabysitting}
              templateColumns="repeat(2, minmax(0, 1fr))"
              gap="12px"
              p="16px"
              css={{
                "@media (max-width: 760px)": {
                  gridTemplateColumns: "1fr",
                },
              }}
            >
              <Box
                as="fieldset"
                minW="0"
                gridColumn="1 / -1"
                m="0"
                p="0"
                border="0"
              >
                <Text
                  as="legend"
                  mb="8px"
                  color="#6d7169"
                  fontSize="11px"
                  fontWeight="700"
                >
                  Who needs a sitter?
                </Text>

                <Grid
                  templateColumns="repeat(auto-fit, minmax(140px, 1fr))"
                  gap="8px"
                >
                  {household.map(
                    (person) => {
                      const selected =
                        babysittingMembers.includes(
                          person.id,
                        );

                      return (
                        <Button
                          type="button"
                          key={person.id}
                          aria-pressed={
                            selected
                          }
                          w="full"
                          minW="0"
                          minH="40px"
                          borderWidth="1px"
                          borderColor={
                            selected
                              ? "#9ccfbd"
                              : "#dddcd5"
                          }
                          borderRadius="8px"
                          bg={
                            selected
                              ? "#e7f3ef"
                              : "#ffffff"
                          }
                          color={
                            selected
                              ? "var(--chakra-colors-green-700)"
                              : "#171915"
                          }
                          px="11px"
                          fontSize="12px"
                          fontWeight="650"
                          onClick={() =>
                            toggleBabyMember(
                              person.id,
                            )
                          }
                        >
                          {person.full_name}
                        </Button>
                      );
                    },
                  )}
                </Grid>
              </Box>

              <Stack
                as="label"
                gap="6px"
                minW="0"
              >
                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                  fontWeight="700"
                >
                  Starts
                </Text>

                <HumanDateTimeInput
                  value={babyStart}
                  onChange={setBabyStart}
                />
              </Stack>

              <Stack
                as="label"
                gap="6px"
                minW="0"
              >
                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                  fontWeight="700"
                >
                  Ends
                </Text>

                <HumanDateTimeInput
                  value={babyEnd}
                  onChange={setBabyEnd}
                  defaultDate={babyStart}
                />
              </Stack>

              <Stack
                as="label"
                gridColumn="1 / -1"
                gap="6px"
                minW="0"
              >
                <Text
                  as="span"
                  color="#6d7169"
                  fontSize="11px"
                  fontWeight="700"
                >
                  Notes
                </Text>

                <Textarea
                  rows={2}
                  minH="72px"
                  resize="vertical"
                  placeholder="Anything the sitter should know"
                  value={babyNotes}
                  borderColor="#c8c7bf"
                  borderRadius="8px"
                  bg="#ffffff"
                  px="11px"
                  py="10px"
                  _focus={{
                    borderColor: "var(--chakra-colors-green-600)",
                    boxShadow:
                      "0 0 0 3px #e7f3ef",
                  }}
                  onChange={(e) =>
                    setBabyNotes(
                      e.target.value,
                    )
                  }
                />
              </Stack>

              <HStack
                gridColumn="1 / -1"
                justifyContent="flex-end"
              >
                <Button
                  type="submit"
                  disabled={
                    changesUnavailable
                  }
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
                  css={{
                    "@media (max-width: 620px)": {
                      width: "100%",
                    },
                  }}
                >
                  Request sitter
                </Button>
              </HStack>
            </Grid>
          </Box>

          <Box
            as="section"
            mb="16px"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <Box
              minH="58px"
              display="flex"
              alignItems="center"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Text as="strong">
                Requests
              </Text>
            </Box>

            {eventBabysitting.length ? (
              eventBabysitting.map(
                (request) => (
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
                      "@media (max-width: 620px)": {
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
                        {new Date(
                          request.starts_at,
                        ).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(
                          request.ends_at,
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Stack>

                    <HStack
                      gap="8px"
                      flexWrap="wrap"
                      css={{
                        "@media (max-width: 620px)": {
                          width: "100%",
                          justifyContent:
                            "space-between",
                        },
                      }}
                    >
                      <Box
                        as="span"
                        display="inline-flex"
                        alignItems="center"
                        minH="26px"
                        px="9px"
                        borderWidth="1px"
                        borderColor="#dddcd5"
                        borderRadius="999px"
                        bg="#fbfaf7"
                        color="#6d7169"
                        fontSize="10px"
                        fontWeight="750"
                        textTransform="capitalize"
                      >
                        {request.status}
                      </Box>

                      {[
                        "pending",
                        "confirmed",
                      ].includes(
                        request.status,
                      ) && (
                        <Button
                          type="button"
                          disabled={
                            changesUnavailable
                          }
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
                            void run(() =>
                              cancelBabysittingRequest(
                                request.id,
                              ),
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </HStack>
                  </Box>
                ),
              )
            ) : (
              <Box
                px="20px"
                py="32px"
                color="#6d7169"
                textAlign="center"
                fontSize="12px"
              >
                No babysitting requests.
              </Box>
            )}
          </Box>
        </>
      )}

      {view === "notices" && (
        <>
          {preferences && (
            <Box
              as="section"
              mb="16px"
              overflow="hidden"
              borderWidth="1px"
              borderColor="#dddcd5"
              borderRadius="12px"
              bg="#ffffff"
            >
              <Box
                minH="58px"
                display="flex"
                alignItems="center"
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
                    Notifications
                  </Text>

                  <Text
                    as="span"
                    color="#6d7169"
                    fontSize="11px"
                  >
                    Automatic reminders arrive 30 minutes before activities and meals.
                    Camp notices follow the categories you keep on.
                  </Text>
                </Stack>
              </Box>

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
                    "meal_reminders",
                    "Meal reminders · 30 min before",
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
                          borderBottomWidth:
                            "0",
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
                        disabled={
                          changesUnavailable
                        }
                        checked={
                          preferences[
                            key as keyof Omit<
                              NotificationPreferences,
                              "account_id"
                            >
                          ] as boolean
                        }
                        w="16px"
                        h="16px"
                        minH="16px"
                        flex="0 0 auto"
                        m="0"
                        accentColor="var(--chakra-colors-green-600)"
                        onChange={(e) =>
                          void changePreference(
                            key,
                            e.target.checked,
                          )
                        }
                      />
                    </HStack>
                  ),
                )}
              </Stack>
            </Box>
          )}

          <Box
            as="section"
            mb="16px"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="#ffffff"
          >
            <Box
              minH="58px"
              display="flex"
              alignItems="center"
              px="16px"
              py="13px"
              borderBottomWidth="1px"
              borderColor="#dddcd5"
            >
              <Text as="strong">
                Notices
              </Text>
            </Box>

            {eventNotifications.length ? (
              eventNotifications.map(
                (notice) => (
                  <Stack
                    as="article"
                    key={notice.id}
                    gap="4px"
                    px="14px"
                    py="12px"
                    borderBottomWidth="1px"
                    borderColor="#dddcd5"
                    css={{
                      "&:last-child": {
                        borderBottomWidth: "0",
                      },
                    }}
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

                    <HStack
                      justifyContent="space-between"
                      gap="10px"
                    >
                      <Text
                        as="small"
                        color="#6d7169"
                        fontSize="11px"
                      >
                        {new Date(
                          notice.created_at,
                        ).toLocaleString()}
                      </Text>

                      {!notice.read_at && (
                        <Button
                          type="button"
                          disabled={
                            changesUnavailable
                          }
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
                            void run(() =>
                              markNotificationRead(
                                notice.id,
                              ),
                            )
                          }
                        >
                          Mark read
                        </Button>
                      )}
                    </HStack>
                  </Stack>
                ),
              )
            ) : (
              <Box
                px="20px"
                py="32px"
                color="#6d7169"
                textAlign="center"
                fontSize="12px"
              >
                No notices.
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
