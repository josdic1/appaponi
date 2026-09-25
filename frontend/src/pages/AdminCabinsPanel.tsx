import {
  Alert,
  Box,
  Button,
  Grid,
  HStack,
  NativeSelect,
  Stack,
  Text,
  Textarea,
  chakra,
} from "@chakra-ui/react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Cabin,
} from "@appoponi/shared/schemas/cabins";
import type {
  CampCabinSlotId,
} from "@appoponi/shared/schemas/campMap";
import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";
import type {
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";
import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import {
  assignRegistrationCabin,
  loadCabins,
  loadHouseholdMembers,
  loadRegistrations,
} from "../api/admin";

import {
  createNotification,
  loadAdminNotificationHistory,
} from "../api/services";

import CampMapBase, {
  CAMP_MAP_CABINS,
  CAMP_MAP_HEIGHT,
  CampCabinShape,
  CAMP_MAP_WIDTH,
} from "./CampMapBase";

type Props = {
  activeEventId?: string;
  onChanged?: () => void;
};

export default function AdminCabinsPanel({
  activeEventId = "",
  onChanged,
}: Props) {
  const [cabins, setCabins] =
    useState<Cabin[]>([]);
  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([]);
  const [selectedSlotId, setSelectedSlotId] =
    useState<CampCabinSlotId | null>(null);
  const [
    selectedHouseholdMembers,
    setSelectedHouseholdMembers,
  ] = useState<HouseholdMember[]>([]);
  const [
    notificationHistory,
    setNotificationHistory,
  ] = useState<NotificationRecord[]>([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);
  const [messageBody, setMessageBody] =
    useState("");
  const [messageBusy, setMessageBusy] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const [
      nextCabins,
      nextRegistrations,
    ] = await Promise.all([
      loadCabins(),
      loadRegistrations(),
    ]);

    setCabins(nextCabins);
    setRegistrations(nextRegistrations);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load cabins",
      ),
    );
  }, []);

  async function run(
    action: () => Promise<unknown>,
  ) {
    setError(null);

    try {
      await action();
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  const slotOwners = useMemo(() => {
    const result = new Map<
      CampCabinSlotId,
      Cabin
    >();

    for (const cabin of cabins) {
      if (cabin.map_slot_id) {
        result.set(
          cabin.map_slot_id,
          cabin,
        );
      }
    }

    return result;
  }, [cabins]);

  const activeRegistrations = useMemo(
    () =>
      activeEventId
        ? registrations.filter(
            (registration) =>
              registration.event_id ===
              activeEventId,
          )
        : registrations,
    [activeEventId, registrations],
  );

  const cabinNameById = useMemo(
    () =>
      new Map(
        cabins.map((cabin) => [
          cabin.id,
          cabin.name,
        ]),
      ),
    [cabins],
  );

  function assignmentsFor(
    cabinId: string,
  ) {
    return registrations.filter(
      (registration) =>
        registration.cabin_id === cabinId &&
        (
          !activeEventId ||
          registration.event_id ===
            activeEventId
        ),
    );
  }

  const selectedCabin =
    selectedSlotId
      ? slotOwners.get(
          selectedSlotId,
        ) ?? null
      : null;

  const selectedAssignment =
    selectedCabin
      ? assignmentsFor(
          selectedCabin.id,
        )[0] ?? null
      : null;

  const emptyCabins = useMemo(
    () =>
      cabins.filter(
        (cabin) =>
          cabin.id !==
            selectedCabin?.id &&
          !activeRegistrations.some(
            (registration) =>
              registration.cabin_id ===
              cabin.id,
          ),
      ),
    [
      cabins,
      activeRegistrations,
      selectedCabin?.id,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    setSelectedHouseholdMembers([]);
    setNotificationHistory([]);
    setMessageBody("");

    if (!selectedAssignment) {
      setHistoryLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setHistoryLoading(true);

    Promise.all([
      loadHouseholdMembers(
        selectedAssignment.account_id,
      ),
      loadAdminNotificationHistory(
        selectedAssignment.account_id,
        selectedAssignment.event_id,
      ),
    ])
      .then(
        ([
          householdMembers,
          notifications,
        ]) => {
          if (cancelled) {
            return;
          }

          setSelectedHouseholdMembers(
            householdMembers,
          );
          setNotificationHistory(
            notifications,
          );
        },
      )
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load household details",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedAssignment?.id,
    selectedAssignment?.account_id,
    selectedAssignment?.event_id,
  ]);

  async function refreshMessageHistory(
    registration: EventRegistration,
  ) {
    const notifications =
      await loadAdminNotificationHistory(
        registration.account_id,
        registration.event_id,
      );

    setNotificationHistory(
      notifications,
    );
  }

  async function sendQuickMessage() {
    if (
      !selectedAssignment ||
      !messageBody.trim()
    ) {
      return;
    }

    setMessageBusy(true);
    setError(null);

    try {
      await createNotification({
        account_id: Number(
          selectedAssignment.account_id,
        ),
        event_id: Number(
          selectedAssignment.event_id,
        ),
        kind: "general",
        title: "Message from camp",
        body: messageBody.trim(),
      });

      await refreshMessageHistory(
        selectedAssignment,
      );

      setMessageBody("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send message",
      );
    } finally {
      setMessageBusy(false);
    }
  }

  function moveSelectedHousehold(
    cabinId: string,
  ) {
    if (
      !selectedAssignment ||
      !selectedCabin ||
      !cabinId
    ) {
      return;
    }

    const targetCabin =
      cabins.find(
        (cabin) =>
          cabin.id === cabinId,
      );

    if (!targetCabin) {
      setError(
        "Target cabin does not exist.",
      );
      return;
    }

    const householdName =
      selectedAssignment.household_name ??
      selectedAssignment.username;

    if (
      !window.confirm(
        `Move ${householdName} from ${selectedCabin.name} to ${targetCabin.name}?`,
      )
    ) {
      return;
    }

    void run(async () => {
      await assignRegistrationCabin(
        selectedAssignment.id,
        Number(targetCabin.id),
      );

      if (targetCabin.map_slot_id) {
        setSelectedSlotId(
          targetCabin.map_slot_id,
        );
      }
    });
  }

  function moveHouseholdIntoSelectedCabin(
    registrationId: string,
  ) {
    if (
      !selectedCabin ||
      !registrationId
    ) {
      return;
    }

    const registration =
      activeRegistrations.find(
        (item) =>
          item.id === registrationId,
      );

    if (!registration) {
      setError(
        "Household registration does not exist.",
      );
      return;
    }

    const householdName =
      registration.household_name ??
      registration.username;

    const currentCabin =
      registration.cabin_id
        ? cabinNameById.get(
            registration.cabin_id,
          )
        : null;

    const moveLabel =
      currentCabin
        ? `Move ${householdName} from ${currentCabin} to ${selectedCabin.name}?`
        : `Assign ${householdName} to ${selectedCabin.name}?`;

    if (
      !window.confirm(
        moveLabel,
      )
    ) {
      return;
    }

    void run(() =>
      assignRegistrationCabin(
        registration.id,
        Number(selectedCabin.id),
      ),
    );
  }

  const unreadCount =
    notificationHistory.filter(
      (item) => !item.read_at,
    ).length;

  return (
    <Box
      as="section"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
    >
      <Box
        px="5"
        py="4"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Stack gap="0">
          <Text fontWeight="700">
            Cabin assignments
          </Text>

          <Text
            fontSize="sm"
            color="gray.500"
          >
            Click any cabin for its household, messages, read status, and move controls. Physical cabin positions are permanent reusable setup.
          </Text>
        </Stack>
      </Box>

      {error && (
        <Box p="4">
          <Alert.Root status="error">
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Description>
                {error}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </Box>
      )}

      <Grid
        templateColumns={{
          base: "1fr",
          xl: selectedCabin
            ? "minmax(0, 1fr) 340px"
            : "1fr",
        }}
        alignItems="start"
        bg="#f8f7f2"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Box
          p={{
            base: "3",
            md: "4",
          }}
          minW="0"
        >
          <chakra.svg
            viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
            role="img"
            aria-label="Interactive camp cabin map"
            w="full"
            maxW="1000px"
            mx="auto"
            display="block"
            overflow="hidden"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="white"
          >
            <CampMapBase />

            {CAMP_MAP_CABINS.map(
              (slot) => {
                const owner =
                  slotOwners.get(
                    slot.id,
                  );

                if (!owner) {
                  return null;
                }

                const assignment =
                  assignmentsFor(
                    owner.id,
                  )[0] ?? null;

                const assigned =
                  Boolean(assignment);

                const centerX =
                  slot.x +
                  slot.width / 2;
                const centerY =
                  slot.y +
                  slot.height / 2;

                const numberMatch =
                  owner.name.match(
                    /^Cabin\s+(\d+)$/i,
                  );

                const specialLabel =
                  numberMatch
                    ? null
                    : owner.name.replace(
                        /^The\s+/i,
                        "",
                      );

                const label =
                  numberMatch?.[1] ??
                  specialLabel;

                const isSelected =
                  selectedSlotId ===
                  slot.id;

                const householdName =
                  assignment
                    ? assignment.household_name ??
                      assignment.username
                    : "available";

                const openCabin = () =>
                  setSelectedSlotId(
                    slot.id,
                  );

                return (
                  <chakra.g
                    key={slot.id}
                    role="button"
                    tabIndex={0}
                    data-cabin-slot-id={
                      slot.id
                    }
                    aria-label={`${owner.name} · ${householdName}`}
                    cursor="pointer"
                    pointerEvents="all"
                    onClick={
                      openCabin
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openCabin();
                      }
                    }}
                  >
                    <CampCabinShape
                      slot={slot}
                      state={
                        isSelected
                          ? "selected"
                          : assigned
                            ? "assigned"
                            : "placed"
                      }
                    />

                    <chakra.text
                      x={
                        numberMatch
                          ? centerX
                          : slot.x - 4
                      }
                      y={
                        numberMatch
                          ? centerY + 3
                          : centerY + 2
                      }
                      textAnchor={
                        numberMatch
                          ? "middle"
                          : "end"
                      }
                      fontSize={
                        numberMatch
                          ? "9px"
                          : "7px"
                      }
                      fontWeight="800"
                      fill="#174a32"
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth="2.4"
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    >
                      {label}
                    </chakra.text>
                  </chakra.g>
                );
              },
            )}
          </chakra.svg>
        </Box>

        {selectedCabin && (
          <Box
            data-testid="cabin-command-panel"
            minW="0"
            bg="white"
            borderLeftWidth={{
              base: "0",
              xl: "1px",
            }}
            borderTopWidth={{
              base: "1px",
              xl: "0",
            }}
            borderColor="gray.200"
            p="4"
          >
            <Stack gap="4">
              <HStack
                justifyContent="space-between"
                alignItems="flex-start"
                gap="3"
              >
                <Stack gap="0" minW="0">
                  <Text
                    as="h3"
                    fontWeight="800"
                    fontSize="lg"
                  >
                    {selectedCabin.name}
                  </Text>

                  <Text
                    fontSize="sm"
                    color={
                      selectedAssignment
                        ? "green.700"
                        : "gray.500"
                    }
                    fontWeight="650"
                  >
                    {selectedAssignment
                      ? "Occupied"
                      : "Available"}
                  </Text>
                </Stack>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelectedSlotId(
                      null,
                    )
                  }
                >
                  Close
                </Button>
              </HStack>

              {selectedAssignment ? (
                <>
                  <Box
                    borderTopWidth="1px"
                    borderColor="gray.200"
                    pt="3"
                  >
                    <Stack gap="1">
                      <Text
                        fontWeight="800"
                        fontSize="md"
                      >
                        {selectedAssignment.household_name ??
                          selectedAssignment.username}
                      </Text>

                      <Text
                        fontSize="sm"
                        color="gray.600"
                      >
                        {selectedAssignment.selected_attendees}/{selectedAssignment.spots_paid_for} attending
                        {selectedAssignment.household_lead_name
                          ? ` · Lead: ${selectedAssignment.household_lead_name}`
                          : ""}
                      </Text>

                      {selectedHouseholdMembers.length > 0 && (
                        <Stack
                          gap="1"
                          pt="2"
                        >
                          {selectedHouseholdMembers.map(
                            (member) => (
                              <Text
                                key={
                                  member.id
                                }
                                fontSize="sm"
                              >
                                {member.full_name}
                                <Text
                                  as="span"
                                  color="gray.500"
                                >
                                  {` · ${member.member_role}`}
                                </Text>
                              </Text>
                            ),
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Box>

                  <Box>
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      fontWeight="700"
                      mb="1"
                    >
                      Move household
                    </Text>

                    <NativeSelect.Root
                      disabled={
                        emptyCabins.length ===
                        0
                      }
                    >
                      <NativeSelect.Field
                        aria-label={`Move ${selectedAssignment.household_name ?? selectedAssignment.username} to an empty cabin`}
                        value=""
                        onChange={(
                          event,
                        ) =>
                          moveSelectedHousehold(
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          {emptyCabins.length
                            ? "Choose empty cabin…"
                            : "No empty cabins"}
                        </option>

                        {emptyCabins.map(
                          (cabin) => (
                            <option
                              key={
                                cabin.id
                              }
                              value={
                                cabin.id
                              }
                            >
                              {cabin.name}
                            </option>
                          ),
                        )}
                      </NativeSelect.Field>

                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Box>

                  <Box
                    borderTopWidth="1px"
                    borderColor="gray.200"
                    pt="3"
                  >
                    <HStack
                      justifyContent="space-between"
                      mb="2"
                    >
                      <Text
                        fontWeight="700"
                      >
                        Messages
                      </Text>

                      <Text
                        fontSize="xs"
                        color={
                          unreadCount
                            ? "orange.700"
                            : "gray.500"
                        }
                        fontWeight="700"
                      >
                        {unreadCount} unread
                      </Text>
                    </HStack>

                    <Stack gap="2">
                      <Textarea
                        aria-label={`Quick message to ${selectedAssignment.household_name ?? selectedAssignment.username}`}
                        placeholder="Quick message to this household"
                        rows={3}
                        value={
                          messageBody
                        }
                        onChange={(
                          event,
                        ) =>
                          setMessageBody(
                            event.target
                              .value,
                          )
                        }
                      />

                      <Button
                        type="button"
                        colorPalette="green"
                        alignSelf="flex-end"
                        disabled={
                          messageBusy ||
                          !messageBody.trim()
                        }
                        onClick={() =>
                          void sendQuickMessage()
                        }
                      >
                        {messageBusy
                          ? "Sending…"
                          : "Send message"}
                      </Button>
                    </Stack>
                  </Box>

                  <Box
                    borderTopWidth="1px"
                    borderColor="gray.200"
                    pt="3"
                  >
                    <Text
                      fontWeight="700"
                      mb="2"
                    >
                      Sent
                    </Text>

                    {historyLoading ? (
                      <Text
                        fontSize="sm"
                        color="gray.500"
                      >
                        Loading messages…
                      </Text>
                    ) : notificationHistory.length ? (
                      <Stack gap="2">
                        {notificationHistory.map(
                          (notice) => (
                            <Box
                              key={
                                notice.id
                              }
                              p="2"
                              borderWidth="1px"
                              borderColor="gray.200"
                              borderRadius="md"
                            >
                              <HStack
                                justifyContent="space-between"
                                alignItems="flex-start"
                                gap="2"
                              >
                                <Text
                                  fontSize="sm"
                                  fontWeight="700"
                                >
                                  {notice.title}
                                </Text>

                                <Text
                                  flex="0 0 auto"
                                  fontSize="xs"
                                  fontWeight="800"
                                  color={
                                    notice.read_at
                                      ? "green.700"
                                      : "orange.700"
                                  }
                                >
                                  {notice.read_at
                                    ? "Read"
                                    : "Unread"}
                                </Text>
                              </HStack>

                              <Text
                                mt="1"
                                fontSize="sm"
                                color="gray.700"
                              >
                                {notice.body}
                              </Text>

                              <Text
                                mt="1"
                                fontSize="xs"
                                color="gray.500"
                              >
                                {new Date(
                                  notice.created_at,
                                ).toLocaleString()}
                              </Text>
                            </Box>
                          ),
                        )}
                      </Stack>
                    ) : (
                      <Text
                        fontSize="sm"
                        color="gray.500"
                      >
                        No messages sent to this household for this event.
                      </Text>
                    )}
                  </Box>
                </>
              ) : (
                <Box
                  borderTopWidth="1px"
                  borderColor="gray.200"
                  pt="3"
                >
                  <Stack gap="2">
                    <Text
                      fontWeight="700"
                    >
                      Assign or move a household here
                    </Text>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        aria-label={`Assign household to ${selectedCabin.name}`}
                        value=""
                        onChange={(
                          event,
                        ) =>
                          moveHouseholdIntoSelectedCabin(
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Choose household…
                        </option>

                        {activeRegistrations.map(
                          (
                            registration,
                          ) => {
                            const currentCabin =
                              registration.cabin_id
                                ? cabinNameById.get(
                                    registration.cabin_id,
                                  )
                                : null;

                            return (
                              <option
                                key={
                                  registration.id
                                }
                                value={
                                  registration.id
                                }
                              >
                                {registration.household_name ??
                                  registration.username}
                                {currentCabin
                                  ? ` · move from ${currentCabin}`
                                  : " · unassigned"}
                              </option>
                            );
                          },
                        )}
                      </NativeSelect.Field>

                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Grid>

    </Box>
  );
}
