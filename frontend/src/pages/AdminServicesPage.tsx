import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Alert,
  Box,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";

import {
  Baby,
  BellRing,
  ShoppingBag,
} from "lucide-react";

import type { AccountRecord } from "@appoponi/shared/schemas/accounts";
import type { EventRecord } from "@appoponi/shared/schemas/events";
import type { StaffMember } from "@appoponi/shared/schemas/staffMembers";
import type { FoodOrder } from "@appoponi/shared/schemas/foodOrders";
import type { BabysittingRequest } from "@appoponi/shared/schemas/babysitting";

import { loadAccounts, loadStaffMembers } from "../api/admin";
import { loadEvents } from "../api/operations";
import {
  createEventNotificationBroadcast,
  createNotification,
  loadFoodOrders,
  loadBabysittingRequests,
  updateFoodOrder,
  updateBabysittingRequest,
} from "../api/services";
import HumanDateTimeInput from "../components/HumanDateTimeInput";
import { humanDateTimeToIso } from "../lib/humanDateTime";

import { AdminPageHeader } from "../components/AdminUi";
import PageSectionLayout from "../components/PageSectionLayout";

type View = "orders" | "babysitting" | "notifications";

type Props = {
  activeEventId?: string;
};

export default function AdminServicesPage({ activeEventId = "" }: Props) {
  const [view, setView] = useState<View>("orders");
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [babysitting, setBabysitting] = useState<BabysittingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingBabysittingId, setEditingBabysittingId] =
    useState<string | null>(null);
  const [draftSitterId, setDraftSitterId] = useState("");
  const [babysittingBusyId, setBabysittingBusyId] =
    useState<string | null>(null);

  const [notificationAudience, setNotificationAudience] = useState<"event" | "account">("event");
  const [notificationAccountId, setNotificationAccountId] = useState("");
  const [notificationEventId, setNotificationEventId] = useState("");
  const [notificationKind, setNotificationKind] = useState<"activity" | "meal" | "special" | "general">("general");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [notificationSchedule, setNotificationSchedule] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");

  async function refresh() {
    const [nextAccounts, nextStaff, nextEvents, nextOrders, nextBabysitting] = await Promise.all([
      loadAccounts(),
      loadStaffMembers(),
      loadEvents(),
      loadFoodOrders(activeEventId || undefined),
      loadBabysittingRequests(activeEventId || undefined),
    ]);
    setAccounts(nextAccounts);
    setStaff(nextStaff);
    setEvents(nextEvents);
    setOrders(nextOrders);
    setBabysitting(nextBabysitting);
  }

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : "Could not load services"));
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId) setNotificationEventId(activeEventId);
  }, [activeEventId]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  const activeEvent = events.find((event) => event.id === activeEventId) ?? null;
  const notificationEvent = events.find((event) => event.id === notificationEventId) ?? activeEvent;
  const visibleOrders = orders;
  const visibleBabysitting = babysitting;
  const babysittingStaff = staff.filter((person) => person.babysitting_eligible);

  function beginBabysittingEdit(
    request: BabysittingRequest,
  ) {
    setEditingBabysittingId(request.id);
    setDraftSitterId(
      request.sitter_staff_member_id ?? "",
    );
    setError(null);
  }

  function closeBabysittingEdit() {
    setEditingBabysittingId(null);
    setDraftSitterId("");
  }

  async function applyBabysittingUpdate(
    request: BabysittingRequest,
    input: {
      sitter_staff_member_id?: number | null;
      status?:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled";
    },
  ) {
    setBabysittingBusyId(request.id);
    setError(null);

    try {
      await updateBabysittingRequest(
        request.id,
        input,
      );
      await refresh();
      closeBabysittingEdit();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update babysitting request",
      );
    } finally {
      setBabysittingBusyId(null);
    }
  }

  function confirmBabysitting(
    request: BabysittingRequest,
  ) {
    if (!draftSitterId) {
      setError(
        "Choose an eligible sitter before confirming the booking.",
      );
      return;
    }

    void applyBabysittingUpdate(
      request,
      {
        sitter_staff_member_id:
          Number(draftSitterId),
        status: "confirmed",
      },
    );
  }

  function saveConfirmedSitter(
    request: BabysittingRequest,
  ) {
    if (!draftSitterId) {
      setError(
        "A confirmed booking must have a sitter.",
      );
      return;
    }

    if (
      draftSitterId ===
      (request.sitter_staff_member_id ?? "")
    ) {
      closeBabysittingEdit();
      return;
    }

    if (
      !window.confirm(
        `Change the sitter for ${request.username} · ${request.member_names.join(", ")}?`,
      )
    ) {
      return;
    }

    void applyBabysittingUpdate(
      request,
      {
        sitter_staff_member_id:
          Number(draftSitterId),
      },
    );
  }

  function cancelBabysitting(
    request: BabysittingRequest,
  ) {
    if (
      !window.confirm(
        `Cancel babysitting for ${request.username} · ${request.member_names.join(", ")}? This request will be locked as cancelled.`,
      )
    ) {
      return;
    }

    void applyBabysittingUpdate(
      request,
      {
        status: "cancelled",
      },
    );
  }

  function babysittingTimeLabel(
    request: BabysittingRequest,
  ) {
    const start = new Date(
      request.starts_at,
    );
    const end = new Date(
      request.ends_at,
    );

    return `${start.toLocaleDateString(
      [],
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      },
    )} · ${start.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      },
    )}–${end.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      },
    )}`;
  }

  function submitNotification(event: FormEvent) {
    event.preventDefault();

    if (notificationAudience === "event" && !notificationEventId) {
      setError("Choose an event.");
      return;
    }

    if (notificationAudience === "account" && !notificationAccountId) {
      setError("Choose a recipient.");
      return;
    }

    let scheduledFor: string | null = null;

    try {
      scheduledFor = notificationSchedule.trim()
        ? humanDateTimeToIso(
            notificationSchedule,
            notificationEvent?.starts_at,
          )
        : null;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Enter a valid send time",
      );
      return;
    }

    setNotificationMessage("");

    void run(async () => {
      if (notificationAudience === "event") {
        const result = await createEventNotificationBroadcast({
          event_id: Number(notificationEventId),
          kind: notificationKind,
          title: notificationTitle,
          body: notificationBody,
          scheduled_for: scheduledFor,
        });

        setNotificationMessage(
          scheduledFor
            ? `Scheduled for ${result.recipient_count} households.`
            : `Sent to ${result.recipient_count} households.`,
        );
      } else {
        await createNotification({
          account_id: Number(notificationAccountId),
          event_id: notificationEventId ? Number(notificationEventId) : null,
          kind: notificationKind,
          title: notificationTitle,
          body: notificationBody,
          scheduled_for: scheduledFor,
        });

        setNotificationMessage(
          scheduledFor ? "Notice scheduled." : "Notice sent.",
        );
      }

      setNotificationTitle("");
      setNotificationBody("");
      setNotificationSchedule("");
    });
  }

  const pageSections = [
    {
      id: "service-orders",
      label: "Food requests",
      icon: ShoppingBag,
      active: view === "orders",
      onClick: () => setView("orders"),
    },
    {
      id: "service-babysitting",
      label: "Babysitting",
      icon: Baby,
      active: view === "babysitting",
      onClick: () => setView("babysitting"),
    },
    {
      id: "service-notices",
      label: "Notices",
      icon: BellRing,
      active: view === "notifications",
      onClick: () => setView("notifications"),
    },
  ];

  return (
    <Box as="section" minW="0">
      <Box mb="4">
        <AdminPageHeader
          eyebrow="Admin"
          title="Services"
          description="Manage guest requests and communication. Food planning lives in Meal planning."
        />
      </Box>

      <PageSectionLayout
        items={pageSections}
        label="Services sections"
      >
      {error && (
        <Alert.Root
          status="error"
          mb="3"
        >
          <Alert.Indicator />

          <Alert.Content>
            <Alert.Description>
              {error}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {view === "orders" && (
        <Box
          as="section"
          mt="3"
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
            px="4"
            py="13px"
            borderBottomWidth="1px"
            borderColor="#dddcd5"
          >
            <Stack
              minW="0"
              gap="3px"
            >
              <Text fontWeight="700">
                Food requests
              </Text>

              <Text
                fontSize="11px"
                color="#6d7169"
              >
                {activeEvent
                  ? activeEvent.name
                  : "All events"}{" "}
                ·{" "}
                {
                  visibleOrders.filter(
                    (order) =>
                      order.status === "open",
                  ).length
                }{" "}
                open
              </Text>
            </Stack>
          </Box>

          <Stack gap="0">
            {visibleOrders.length ? (
              visibleOrders.map((order) => (
                <Grid
                  key={order.id}
                  templateColumns="minmax(0, 1fr) minmax(150px, 200px) minmax(120px, 160px)"
                  alignItems="center"
                  gap="2"
                  minH="58px"
                  px="14px"
                  py="10px"
                  borderBottomWidth="1px"
                  borderColor="#dddcd5"
                  css={{
                    "@media (max-width: 760px)": {
                      gridTemplateColumns:
                        "1fr",
                      alignItems:
                        "stretch",
                    },
                  }}
                >
                  <Stack
                    minW="0"
                    gap="3px"
                  >
                    <Text fontWeight="700">
                      {order.username}
                      {order.requested_by_name
                        ? ` · ${order.requested_by_name}`
                        : ""}
                    </Text>

                    <Text
                      fontSize="11px"
                      color="#6d7169"
                    >
                      {order.offering_type ===
                      "SNACK"
                        ? "Snack"
                        : "After-hours"}{" "}
                      ·{" "}
                      {order.items
                        .map(
                          (item) =>
                            `${item.quantity}× ${item.item_name}`,
                        )
                        .join(" · ")}
                    </Text>

                    <Text
                      fontSize="11px"
                      color="#6d7169"
                    >
                      {order.fulfillment}
                      {order.delivery_location
                        ? ` · ${order.delivery_location}`
                        : ""}
                    </Text>
                  </Stack>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      aria-label={`Assign ${order.username} order`}
                      value={
                        order.assigned_staff_member_id ??
                        ""
                      }
                      onChange={(event) =>
                        void run(() =>
                          updateFoodOrder(
                            order.id,
                            {
                              assigned_staff_member_id:
                                event.target.value
                                  ? Number(
                                      event.target
                                        .value,
                                    )
                                  : null,
                            },
                          ),
                        )
                      }
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {staff.map((person) => (
                        <option
                          key={person.id}
                          value={person.id}
                        >
                          {person.full_name}
                        </option>
                      ))}
                    </NativeSelect.Field>

                    <NativeSelect.Indicator />
                  </NativeSelect.Root>

                  <NativeSelect.Root>
                    <NativeSelect.Field
                      aria-label={`Status for ${order.username} order`}
                      value={order.status}
                      onChange={(event) =>
                        void run(() =>
                          updateFoodOrder(
                            order.id,
                            {
                              status:
                                event.target
                                  .value as
                                  | "open"
                                  | "fulfilled"
                                  | "cancelled",
                            },
                          ),
                        )
                      }
                    >
                      <option value="open">
                        Open
                      </option>
                      <option value="fulfilled">
                        Fulfilled
                      </option>
                      <option value="cancelled">
                        Cancelled
                      </option>
                    </NativeSelect.Field>

                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Grid>
              ))
            ) : (
              <Box
                px="5"
                py="8"
                textAlign="center"
              >
                <Text
                  fontSize="12px"
                  color="#6d7169"
                >
                  No food requests.
                </Text>
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {view === "babysitting" && (
        <Box
          as="section"
          mt="3"
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
            px="4"
            py="13px"
            borderBottomWidth="1px"
            borderColor="#dddcd5"
          >
            <Stack
              minW="0"
              gap="3px"
            >
              <Text fontWeight="700">
                Babysitting bookings
              </Text>

              <Text
                fontSize="11px"
                color="#6d7169"
              >
                Review a request, choose an eligible sitter, then confirm it. Nothing changes just by opening a menu.
              </Text>
            </Stack>
          </Box>

          {visibleBabysitting.length ? (
            <Stack
              gap="3"
              p="3"
            >
              {visibleBabysitting.map(
                (request) => {
                  const editing =
                    editingBabysittingId ===
                    request.id;
                  const busy =
                    babysittingBusyId ===
                    request.id;
                  const locked =
                    request.status ===
                      "completed" ||
                    request.status ===
                      "cancelled";

                  const statusLabel =
                    request.status ===
                    "confirmed"
                      ? "Confirmed"
                      : request.status ===
                          "completed"
                        ? "Completed"
                        : request.status ===
                            "cancelled"
                          ? "Cancelled"
                          : "Needs review";

                  return (
                    <Box
                      key={request.id}
                      overflow="hidden"
                      borderWidth="1px"
                      borderColor="#dddcd5"
                      borderRadius="10px"
                      bg="white"
                    >
                      <Grid
                        templateColumns={{
                          base: "1fr",
                          lg: "minmax(0, 1fr) auto",
                        }}
                        alignItems={{
                          base: "stretch",
                          lg: "center",
                        }}
                        gap="4"
                        px="4"
                        py="3"
                      >
                        <Stack
                          minW="0"
                          gap="3px"
                        >
                          <Text fontWeight="700">
                            {request.username} ·{" "}
                            {request.member_names.join(
                              ", ",
                            )}
                          </Text>

                          <Text
                            fontSize="12px"
                            color="#555b53"
                          >
                            {babysittingTimeLabel(
                              request,
                            )}
                          </Text>

                          {request.notes && (
                            <Text
                              fontSize="11px"
                              color="#6d7169"
                            >
                              {request.notes}
                            </Text>
                          )}
                        </Stack>

                        <HStack
                          gap="3"
                          flexWrap="wrap"
                          justifyContent={{
                            base: "flex-start",
                            lg: "flex-end",
                          }}
                        >
                          <Box
                            minW="118px"
                            px="3"
                            py="2"
                            borderWidth="1px"
                            borderColor="#dddcd5"
                            borderRadius="8px"
                            bg="#fafaf7"
                          >
                            <Text
                              fontSize="10px"
                              color="#6d7169"
                              textTransform="uppercase"
                              letterSpacing=".06em"
                            >
                              Status
                            </Text>

                            <Text
                              fontSize="13px"
                              fontWeight="700"
                              color={
                                request.status ===
                                "cancelled"
                                  ? "red.700"
                                  : request.status ===
                                        "confirmed"
                                    ? "green.700"
                                    : "#20231f"
                              }
                            >
                              {statusLabel}
                            </Text>
                          </Box>

                          <Box
                            minW="150px"
                            px="3"
                            py="2"
                            borderWidth="1px"
                            borderColor="#dddcd5"
                            borderRadius="8px"
                            bg="#fafaf7"
                          >
                            <Text
                              fontSize="10px"
                              color="#6d7169"
                              textTransform="uppercase"
                              letterSpacing=".06em"
                            >
                              Sitter
                            </Text>

                            <Text
                              fontSize="13px"
                              fontWeight="700"
                            >
                              {request.sitter_name ??
                                "Not assigned"}
                            </Text>
                          </Box>

                          {!locked && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                editing
                                  ? closeBabysittingEdit()
                                  : beginBabysittingEdit(
                                      request,
                                    )
                              }
                            >
                              {editing
                                ? "Close"
                                : request.status ===
                                    "confirmed"
                                  ? "Manage"
                                  : "Review"}
                            </Button>
                          )}
                        </HStack>
                      </Grid>

                      {editing && !locked && (
                        <Box
                          px="4"
                          py="4"
                          bg="#f8f7f2"
                          borderTopWidth="1px"
                          borderColor="#dddcd5"
                        >
                          <Grid
                            templateColumns={{
                              base: "1fr",
                              md: "minmax(220px, 320px) minmax(0, 1fr)",
                            }}
                            gap="4"
                            alignItems="end"
                          >
                            <Field.Root>
                              <Field.Label>
                                Eligible sitter
                              </Field.Label>

                              <NativeSelect.Root
                                disabled={busy}
                              >
                                <NativeSelect.Field
                                  value={
                                    draftSitterId
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setDraftSitterId(
                                      event.target
                                        .value,
                                    )
                                  }
                                >
                                  {request.status ===
                                    "pending" && (
                                    <option value="">
                                      Choose sitter
                                    </option>
                                  )}

                                  {babysittingStaff.map(
                                    (person) => (
                                      <option
                                        key={
                                          person.id
                                        }
                                        value={
                                          person.id
                                        }
                                      >
                                        {
                                          person.full_name
                                        }
                                      </option>
                                    ),
                                  )}
                                </NativeSelect.Field>

                                <NativeSelect.Indicator />
                              </NativeSelect.Root>
                            </Field.Root>

                            <HStack
                              gap="2"
                              flexWrap="wrap"
                            >
                              {request.status ===
                              "pending" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  colorPalette="green"
                                  disabled={
                                    busy ||
                                    !draftSitterId
                                  }
                                  onClick={() =>
                                    confirmBabysitting(
                                      request,
                                    )
                                  }
                                >
                                  Confirm booking
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  colorPalette="green"
                                  disabled={
                                    busy ||
                                    !draftSitterId ||
                                    draftSitterId ===
                                      (request.sitter_staff_member_id ??
                                        "")
                                  }
                                  onClick={() =>
                                    saveConfirmedSitter(
                                      request,
                                    )
                                  }
                                >
                                  Save sitter
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                disabled={busy}
                                onClick={() =>
                                  cancelBabysitting(
                                    request,
                                  )
                                }
                              >
                                Cancel request
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={busy}
                                onClick={
                                  closeBabysittingEdit
                                }
                              >
                                Keep unchanged
                              </Button>
                            </HStack>
                          </Grid>

                          <Text
                            mt="3"
                            fontSize="11px"
                            color="#6d7169"
                          >
                            Selecting a sitter does not save anything. Confirmation and cancellation require an explicit action.
                          </Text>
                        </Box>
                      )}
                    </Box>
                  );
                },
              )}
            </Stack>
          ) : (
            <Box
              px="5"
              py="8"
              textAlign="center"
            >
              <Text
                fontSize="12px"
                color="#6d7169"
              >
                No babysitting requests.
              </Text>
            </Box>
          )}
        </Box>
      )}

      {view === "notifications" && (
        <Box
          as="section"
          mt="3"
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
            px="4"
            py="13px"
            borderBottomWidth="1px"
            borderColor="#dddcd5"
          >
            <Stack
              minW="0"
              gap="3px"
            >
              <Text fontWeight="700">
                Send notice
              </Text>

              <Text
                fontSize="11px"
                color="#6d7169"
              >
                Send now or schedule it. Event notices go to every registered household.
              </Text>
            </Stack>
          </Box>

          {notificationMessage && (
            <Box p="4" pb="0">
              <Alert.Root status="success">
                <Alert.Indicator />

                <Alert.Content>
                  <Alert.Description>
                    {notificationMessage}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            </Box>
          )}

          <Grid
            as="form"
            onSubmit={submitNotification}
            templateColumns="repeat(2, minmax(0, 1fr))"
            gap="3"
            p="4"
            css={{
              "@media (max-width: 900px)": {
                gridTemplateColumns:
                  "1fr",
              },
            }}
          >
            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Notice audience"
                value={notificationAudience}
                onChange={(event) => {
                  setNotificationAudience(
                    event.target.value as
                      | "event"
                      | "account",
                  );
                  setNotificationMessage("");
                }}
              >
                <option value="event">
                  All registered households
                </option>
                <option value="account">
                  One account
                </option>
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>

            {notificationAudience ===
              "account" && (
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label="Notice recipient"
                  value={notificationAccountId}
                  onChange={(event) =>
                    setNotificationAccountId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Recipient
                  </option>

                  {accounts.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.display_name ??
                        item.username}
                    </option>
                  ))}
                </NativeSelect.Field>

                <NativeSelect.Indicator />
              </NativeSelect.Root>
            )}

            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Notice event"
                value={notificationEventId}
                onChange={(event) =>
                  setNotificationEventId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {notificationAudience ===
                  "event"
                    ? "Event"
                    : "No event"}
                </option>

                {events.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <NativeSelect.Root>
              <NativeSelect.Field
                aria-label="Notice type"
                value={notificationKind}
                onChange={(event) =>
                  setNotificationKind(
                    event.target
                      .value as typeof notificationKind,
                  )
                }
              >
                <option value="general">
                  General
                </option>
                <option value="activity">
                  Activity
                </option>
                <option value="meal">
                  Meal
                </option>
                <option value="special">
                  Special
                </option>
              </NativeSelect.Field>

              <NativeSelect.Indicator />
            </NativeSelect.Root>

            <Input
              placeholder="Title"
              value={notificationTitle}
              onChange={(event) =>
                setNotificationTitle(
                  event.target.value,
                )
              }
              required
            />

            <Textarea
              placeholder="Message"
              value={notificationBody}
              onChange={(event) =>
                setNotificationBody(
                  event.target.value,
                )
              }
              required
            />

            <Field.Root>
              <Field.Label>
                Send later
              </Field.Label>

              <HumanDateTimeInput
                value={notificationSchedule}
                onChange={
                  setNotificationSchedule
                }
                defaultDate={
                  notificationEvent?.starts_at
                }
                placeholder="Leave blank for now"
              />
            </Field.Root>

            <HStack
              gridColumn={{
                lg: "1 / -1",
              }}
              justifyContent="flex-end"
            >
              <Button
                type="submit"
                colorPalette="green"
              >
                {notificationSchedule.trim()
                  ? "Schedule notice"
                  : "Send notice"}
              </Button>
            </HStack>
          </Grid>
        </Box>
      )}
      </PageSectionLayout>
    </Box>
  );
}
