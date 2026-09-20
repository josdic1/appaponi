import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type { Area } from "@appoponi/shared/schemas/areas";
import type { Activity } from "@appoponi/shared/schemas/activities";
import type { EventRecord } from "@appoponi/shared/schemas/events";
import type { StaffMember } from "@appoponi/shared/schemas/staffMembers";
import type { Qualification } from "@appoponi/shared/schemas/qualifications";
import type {
  ActivityQualification,
  EventActivity,
  EventActivityStaff,
  StaffArea,
  StaffQualification,
} from "@appoponi/shared/schemas/scheduling";

import {
  loadAreas,
  loadActivities,
  loadEvents,
} from "../api/operations";

import {
  loadStaffMembers,
} from "../api/admin";

import {
  addActivityQualification,
  addEventActivity,
  addStaffArea,
  addStaffQualification,
  assignEventActivityStaff,
  createQualification,
  loadQualifications,
  loadScheduling,
  removeActivityQualification,
  removeEventActivity,
  removeEventActivityStaff,
  removeQualification,
  removeStaffArea,
  removeStaffQualification,
} from "../api/scheduling";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

import { AdminPageHeader } from "../components/AdminUi";

type Props = {
  activeEventId?: string;
};

function scheduleDayKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function scheduleDayLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function scheduleTimeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminSchedulingPage({
  activeEventId = "",
}: Props) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [qualifications, setQualifications] =
    useState<Qualification[]>([]);

  const [staffAreas, setStaffAreas] =
    useState<StaffArea[]>([]);

  const [staffQualifications, setStaffQualifications] =
    useState<StaffQualification[]>([]);

  const [
    activityQualifications,
    setActivityQualifications,
  ] = useState<ActivityQualification[]>([]);

  const [eventActivities, setEventActivities] =
    useState<EventActivity[]>([]);

  const [
    eventActivityStaff,
    setEventActivityStaff,
  ] = useState<EventActivityStaff[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [qualificationName, setQualificationName] =
    useState("");

  const [staffAreaStaff, setStaffAreaStaff] = useState("");
  const [staffAreaArea, setStaffAreaArea] = useState("");

  const [staffQualStaff, setStaffQualStaff] = useState("");
  const [staffQualQual, setStaffQualQual] = useState("");

  const [activityQualActivity, setActivityQualActivity] =
    useState("");
  const [activityQualQual, setActivityQualQual] =
    useState("");
  const [requiredCount, setRequiredCount] = useState("1");

  const [scheduleEvent, setScheduleEvent] = useState("");
  const [scheduleActivity, setScheduleActivity] = useState("");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleCapacity, setScheduleCapacity] =
    useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const [editingActivityId, setEditingActivityId] =
    useState<string | null>(null);
  const [editingStaffId, setEditingStaffId] =
    useState("");

  async function refresh() {
    const [
      nextAreas,
      nextActivities,
      nextEvents,
      nextStaff,
      nextQualifications,
      scheduling,
    ] = await Promise.all([
      loadAreas(),
      loadActivities(),
      loadEvents(),
      loadStaffMembers(),
      loadQualifications(),
      loadScheduling(activeEventId || undefined),
    ]);

    setAreas(nextAreas);
    setActivities(nextActivities);
    setEvents(nextEvents);
    setStaff(nextStaff);
    setQualifications(nextQualifications);
    setStaffAreas(scheduling.staffAreas);
    setStaffQualifications(
      scheduling.staffQualifications,
    );
    setActivityQualifications(
      scheduling.activityQualifications,
    );
    setEventActivities(
      scheduling.eventActivities,
    );
    setEventActivityStaff(
      scheduling.eventActivityStaff,
    );
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load scheduling",
      ),
    );
  }, [activeEventId]);

  useEffect(() => {
    if (activeEventId) {
      setScheduleEvent(activeEventId);
    }
  }, [activeEventId]);

  const visibleEventActivities = activeEventId
    ? eventActivities.filter(
        (item) => item.event_id === activeEventId,
      )
    : eventActivities;

  const scheduleByDay = (() => {
    const groups = new Map<string, EventActivity[]>();

    for (const item of [...visibleEventActivities].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() -
        new Date(b.starts_at).getTime(),
    )) {
      const key = scheduleDayKey(item.starts_at);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return Array.from(groups.entries());
  })();

  async function run(action: () => Promise<unknown>) {
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

  function confirmRemove(
    label: string,
    action: () => Promise<unknown>,
  ) {
    if (
      !window.confirm(
        `Remove ${label}?`,
      )
    ) {
      return;
    }

    void run(action);
  }

  function submitQualification(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await createQualification(qualificationName);
      setQualificationName("");
    });
  }

  function submitStaffArea(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await addStaffArea(
        Number(staffAreaStaff),
        Number(staffAreaArea),
      );
    });
  }

  function submitStaffQualification(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await addStaffQualification(
        Number(staffQualStaff),
        Number(staffQualQual),
      );
    });
  }

  function submitActivityQualification(
    event: FormEvent,
  ) {
    event.preventDefault();

    void run(async () => {
      await addActivityQualification(
        Number(activityQualActivity),
        Number(activityQualQual),
        Number(requiredCount),
      );
    });
  }

  function submitSchedule(event: FormEvent) {
    event.preventDefault();

    void run(async () => {
      await addEventActivity({
        event_id: Number(scheduleEvent),
        activity_id: Number(scheduleActivity),
        starts_at:
          humanDateTimeToIso(
            scheduleStart,
            events.find(
              (item) =>
                item.id ===
                scheduleEvent,
            )?.starts_at,
          ),
        ends_at:
          humanDateTimeToIso(
            scheduleEnd,
            events.find(
              (item) =>
                item.id ===
                scheduleEvent,
            )?.starts_at,
          ),
        capacity: scheduleCapacity
          ? Number(scheduleCapacity)
          : null,
      });

      setScheduleStart("");
      setScheduleEnd("");
      setScheduleCapacity("");
      setIsAddingActivity(false);
    });
  }

  function submitActivityStaff(
    event: FormEvent,
    eventActivityId: string,
  ) {
    event.preventDefault();

    if (!editingStaffId) {
      return;
    }

    void run(async () => {
      await assignEventActivityStaff(
        Number(eventActivityId),
        Number(editingStaffId),
      );
      setEditingStaffId("");
    });
  }

  return (
    <Box
      as="section"
      px={{ base: "4", md: "6" }}
      py="6"
      maxW="1400px"
      mx="auto"
      w="full"
    >
      <Stack gap="6">
        <Box
          display="flex"
          flexDirection={{
            base: "column",
            lg: "row",
          }}
          alignItems={{
            base: "stretch",
            lg: "flex-start",
          }}
          justifyContent="space-between"
          gap="5"
        >
          <AdminPageHeader
            eyebrow="Admin"
            title="Schedule"
            description="See the event first. Add activities or change staffing only when you need to."
          />

          <Stack
            gap="3"
            w={{
              base: "full",
              lg: "400px",
            }}
            flexShrink="0"
          >
            <Button
              type="button"
              colorPalette="green"
              alignSelf={{
                base: "stretch",
                lg: "flex-end",
              }}
              aria-expanded={isAddingActivity}
              onClick={() =>
                setIsAddingActivity(
                  (open) => !open,
                )
              }
            >
              {isAddingActivity
                ? "Close"
                : "Add activity"}
            </Button>

            {isAddingActivity && (
              <Box
                as="form"
                onSubmit={submitSchedule}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                bg="white"
                p="4"
              >
                <Stack gap="4">
                  <Field.Root>
                    <Field.Label>
                      Event
                    </Field.Label>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={scheduleEvent}
                        onChange={(event) =>
                          setScheduleEvent(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Choose event
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
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      Activity
                    </Field.Label>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={
                          scheduleActivity
                        }
                        onChange={(event) =>
                          setScheduleActivity(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Choose activity
                        </option>

                        {activities.map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ),
                        )}
                      </NativeSelect.Field>

                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      Starts
                    </Field.Label>

                    <HumanDateTimeInput
                      value={scheduleStart}
                      onChange={
                        setScheduleStart
                      }
                      defaultDate={
                        events.find(
                          (item) =>
                            item.id ===
                            scheduleEvent,
                        )?.starts_at
                      }
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      Ends
                    </Field.Label>

                    <HumanDateTimeInput
                      value={scheduleEnd}
                      onChange={
                        setScheduleEnd
                      }
                      defaultDate={
                        events.find(
                          (item) =>
                            item.id ===
                            scheduleEvent,
                        )?.starts_at
                      }
                    />
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      Capacity
                    </Field.Label>

                    <Input
                      type="number"
                      min="1"
                      value={
                        scheduleCapacity
                      }
                      onChange={(event) =>
                        setScheduleCapacity(
                          event.target.value,
                        )
                      }
                      placeholder="Optional"
                    />
                  </Field.Root>

                  <HStack>
                    <Button
                      type="submit"
                      colorPalette="green"
                    >
                      Add to schedule
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setIsAddingActivity(
                          false,
                        )
                      }
                    >
                      Cancel
                    </Button>
                  </HStack>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>

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

        <Box
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
            <Text fontWeight="700">
              Activity schedule
            </Text>

            <Text
              fontSize="sm"
              color="gray.500"
            >
              {visibleEventActivities.length} scheduled activities
            </Text>
          </Box>

          {scheduleByDay.length ? (
            <Stack gap="0">
              {scheduleByDay.map(
                ([
                  dayKey,
                  dayActivities,
                ]) => (
                  <Box key={dayKey}>
                    <Box
                      px="5"
                      py="3"
                      bg="gray.50"
                      borderBottomWidth="1px"
                      borderColor="gray.200"
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      gap="3"
                    >
                      <Text fontWeight="700">
                        {scheduleDayLabel(
                          dayActivities[0]
                            .starts_at,
                        )}
                      </Text>

                      <Text
                        fontSize="sm"
                        color="gray.500"
                      >
                        {dayActivities.length} activities
                      </Text>
                    </Box>

                    {dayActivities.map(
                      (item) => {
                        const assigned =
                          eventActivityStaff.filter(
                            (
                              staffAssignment,
                            ) =>
                              staffAssignment.event_activity_id ===
                              item.id,
                          );

                        const isEditing =
                          editingActivityId ===
                          item.id;

                        return (
                          <Box
                            key={item.id}
                            px="5"
                            py="4"
                            borderBottomWidth="1px"
                            borderColor="gray.100"
                          >
                            <Stack gap="4">
                              <Box
                                display="grid"
                                gridTemplateColumns={{
                                  base: "1fr",
                                  md: "110px minmax(0, 1fr) auto",
                                }}
                                alignItems="center"
                                gap="4"
                              >
                                <Stack gap="0">
                                  <Text fontWeight="700">
                                    {scheduleTimeLabel(
                                      item.starts_at,
                                    )}
                                  </Text>

                                  <Text
                                    fontSize="sm"
                                    color="gray.500"
                                  >
                                    {scheduleTimeLabel(
                                      item.ends_at,
                                    )}
                                  </Text>
                                </Stack>

                                <Stack gap="0">
                                  <Text fontWeight="700">
                                    {
                                      item.activity_name
                                    }
                                  </Text>

                                  <Text
                                    fontSize="sm"
                                    color="gray.500"
                                  >
                                    {
                                      item.area_name
                                    }
                                  </Text>

                                  <Text
                                    fontSize="sm"
                                    color={
                                      assigned.length
                                        ? "gray.600"
                                        : "orange.600"
                                    }
                                  >
                                    {assigned.length
                                      ? `Staff · ${assigned
                                          .map(
                                            (
                                              person,
                                            ) =>
                                              person.staff_name,
                                          )
                                          .join(
                                            ", ",
                                          )}`
                                      : "Unstaffed"}
                                  </Text>
                                </Stack>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  aria-expanded={
                                    isEditing
                                  }
                                  onClick={() => {
                                    setEditingActivityId(
                                      isEditing
                                        ? null
                                        : item.id,
                                    );
                                    setEditingStaffId(
                                      "",
                                    );
                                  }}
                                >
                                  {isEditing
                                    ? "Done"
                                    : "Edit"}
                                </Button>
                              </Box>

                              {isEditing && (
                                <Box
                                  bg="gray.50"
                                  borderWidth="1px"
                                  borderColor="gray.200"
                                  borderRadius="lg"
                                  p="4"
                                >
                                  <Stack gap="4">
                                    <Stack gap="2">
                                      <Text fontWeight="700">
                                        Staff
                                      </Text>

                                      {assigned.length ? (
                                        <HStack
                                          gap="2"
                                          flexWrap="wrap"
                                        >
                                          {assigned.map(
                                            (
                                              person,
                                            ) => (
                                              <Badge
                                                key={
                                                  person.id
                                                }
                                                colorPalette="green"
                                                display="inline-flex"
                                                alignItems="center"
                                                gap="1"
                                                px="2"
                                                py="1"
                                              >
                                                {
                                                  person.staff_name
                                                }

                                                <Button
                                                  type="button"
                                                  size="xs"
                                                  variant="ghost"
                                                  minW="auto"
                                                  h="5"
                                                  px="1"
                                                  aria-label={`Remove ${person.staff_name}`}
                                                  onClick={() =>
                                                    confirmRemove(
                                                      `${person.staff_name} from ${item.activity_name}`,
                                                      () =>
                                                        removeEventActivityStaff(
                                                          person.id,
                                                        ),
                                                    )
                                                  }
                                                >
                                                  ×
                                                </Button>
                                              </Badge>
                                            ),
                                          )}
                                        </HStack>
                                      ) : (
                                        <Text
                                          fontSize="sm"
                                          color="gray.500"
                                        >
                                          No staff assigned
                                        </Text>
                                      )}
                                    </Stack>

                                    <Box
                                      as="form"
                                      onSubmit={(
                                        event,
                                      ) =>
                                        submitActivityStaff(
                                          event,
                                          item.id,
                                        )
                                      }
                                    >
                                      <HStack
                                        alignItems="stretch"
                                        flexDirection={{
                                          base: "column",
                                          sm: "row",
                                        }}
                                      >
                                        <NativeSelect.Root flex="1">
                                          <NativeSelect.Field
                                            aria-label={`Add staff to ${item.activity_name}`}
                                            value={
                                              editingStaffId
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              setEditingStaffId(
                                                event
                                                  .target
                                                  .value,
                                              )
                                            }
                                          >
                                            <option value="">
                                              Add staff…
                                            </option>

                                            {staff
                                              .filter(
                                                (
                                                  person,
                                                ) =>
                                                  !assigned.some(
                                                    (
                                                      assignment,
                                                    ) =>
                                                      assignment.staff_member_id ===
                                                      person.id,
                                                  ),
                                              )
                                              .map(
                                                (
                                                  person,
                                                ) => (
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

                                        <Button
                                          type="submit"
                                          colorPalette="green"
                                          disabled={
                                            !editingStaffId
                                          }
                                        >
                                          Add staff
                                        </Button>
                                      </HStack>
                                    </Box>

                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      colorPalette="red"
                                      alignSelf="flex-start"
                                      onClick={() =>
                                        confirmRemove(
                                          `scheduled ${item.activity_name}`,
                                          () =>
                                            removeEventActivity(
                                              item.id,
                                            ),
                                        )
                                      }
                                    >
                                      Remove activity
                                    </Button>
                                  </Stack>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        );
                      },
                    )}
                  </Box>
                ),
              )}
            </Stack>
          ) : (
            <Box
              p="8"
              textAlign="center"
            >
              <Text color="gray.500">
                No scheduled activities yet.
              </Text>
            </Box>
          )}
        </Box>

        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          bg="white"
          overflow="hidden"
        >
          <details open>
            <Box
              as="summary"
              cursor="pointer"
              px="5"
              py="4"
            >
              <Box
                display="flex"
                flexDirection={{
                  base: "column",
                  sm: "row",
                }}
                justifyContent="space-between"
                alignItems={{
                  base: "flex-start",
                  sm: "center",
                }}
                gap="3"
              >
                <Stack gap="0">
                  <Text fontWeight="700">
                    Scheduling libraries
                  </Text>

                  <Text
                    fontSize="sm"
                    color="gray.500"
                  >
                    Reusable qualifications and activity staffing rules stay when events are cleared.
                  </Text>
                </Stack>

                <Badge colorPalette="green">
                  Reusable setup
                </Badge>
              </Box>
            </Box>

            <Box
              borderTopWidth="1px"
              borderColor="gray.200"
              p={{ base: "4", md: "5" }}
            >
              <Grid
                templateColumns={{
                  base: "1fr",
                  xl: "repeat(2, minmax(0, 1fr))",
                }}
                gap="5"
                alignItems="start"
              >
                <Stack gap="5">
                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p="4"
                  >
                    <Stack gap="4">
                      <Box>
                        <Text fontWeight="700">
                          Qualification library
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          {qualifications.length} reusable skill{qualifications.length === 1 ? "" : "s"}
                        </Text>
                      </Box>

                      <Box
                        as="form"
                        onSubmit={
                          submitQualification
                        }
                      >
                        <HStack
                          alignItems="end"
                          flexDirection={{
                            base: "column",
                            sm: "row",
                          }}
                        >
                          <Field.Root flex="1">
                            <Field.Label>
                              Name
                            </Field.Label>

                            <Input
                              value={
                                qualificationName
                              }
                              onChange={(
                                event,
                              ) =>
                                setQualificationName(
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </Field.Root>

                          <Button
                            type="submit"
                            colorPalette="green"
                          >
                            Add
                          </Button>
                        </HStack>
                      </Box>

                      <Stack gap="2">
                        {qualifications.map(
                          (item) => (
                            <Box
                              key={item.id}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              gap="3"
                              py="2"
                              borderTopWidth="1px"
                              borderColor="gray.100"
                            >
                              <Text>
                                {item.name}
                              </Text>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() =>
                                  confirmRemove(
                                    `qualification "${item.name}"`,
                                    () =>
                                      removeQualification(
                                        item.id,
                                      ),
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </Box>
                          ),
                        )}
                      </Stack>
                    </Stack>
                  </Box>

                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p="4"
                  >
                    <Stack gap="4">
                      <Box>
                        <Text fontWeight="700">
                          Staff → qualifications
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          {staffQualifications.length} current assignment{staffQualifications.length === 1 ? "" : "s"}
                        </Text>
                      </Box>

                      <Box
                        as="form"
                        onSubmit={
                          submitStaffQualification
                        }
                      >
                        <Grid
                          templateColumns={{
                            base: "1fr",
                            md: "minmax(0, 1fr) minmax(0, 1fr) auto",
                          }}
                          gap="3"
                          alignItems="end"
                        >
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={
                                staffQualStaff
                              }
                              onChange={(
                                event,
                              ) =>
                                setStaffQualStaff(
                                  event.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Choose staff
                              </option>

                              {staff.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {
                                      item.full_name
                                    }
                                  </option>
                                ),
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>

                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={
                                staffQualQual
                              }
                              onChange={(
                                event,
                              ) =>
                                setStaffQualQual(
                                  event.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Choose qualification
                              </option>

                              {qualifications.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {item.name}
                                  </option>
                                ),
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>

                          <Button
                            type="submit"
                            colorPalette="green"
                          >
                            Assign
                          </Button>
                        </Grid>
                      </Box>

                      <Stack gap="2">
                        {staffQualifications.map(
                          (item) => (
                            <Box
                              key={item.id}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              gap="3"
                              py="2"
                              borderTopWidth="1px"
                              borderColor="gray.100"
                            >
                              <Text>
                                {item.staff_name} → {item.qualification_name}
                              </Text>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() =>
                                  confirmRemove(
                                    `${item.qualification_name} from ${item.staff_name}`,
                                    () =>
                                      removeStaffQualification(
                                        item.id,
                                      ),
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </Box>
                          ),
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>

                <Stack gap="5">
                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p="4"
                  >
                    <Stack gap="4">
                      <Box>
                        <Text fontWeight="700">
                          Staff → place assignments
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          {staffAreas.length} current assignment{staffAreas.length === 1 ? "" : "s"}
                        </Text>
                      </Box>

                      <Box
                        as="form"
                        onSubmit={
                          submitStaffArea
                        }
                      >
                        <Grid
                          templateColumns={{
                            base: "1fr",
                            md: "minmax(0, 1fr) minmax(0, 1fr) auto",
                          }}
                          gap="3"
                          alignItems="end"
                        >
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={
                                staffAreaStaff
                              }
                              onChange={(
                                event,
                              ) =>
                                setStaffAreaStaff(
                                  event.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Choose staff
                              </option>

                              {staff.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {
                                      item.full_name
                                    }
                                  </option>
                                ),
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>

                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={
                                staffAreaArea
                              }
                              onChange={(
                                event,
                              ) =>
                                setStaffAreaArea(
                                  event.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Choose area
                              </option>

                              {areas.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {item.name}
                                  </option>
                                ),
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>

                          <Button
                            type="submit"
                            colorPalette="green"
                          >
                            Assign
                          </Button>
                        </Grid>
                      </Box>

                      <Stack gap="2">
                        {staffAreas.map(
                          (item) => (
                            <Box
                              key={item.id}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              gap="3"
                              py="2"
                              borderTopWidth="1px"
                              borderColor="gray.100"
                            >
                              <Text>
                                {item.staff_name} → {item.area_name}
                              </Text>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() =>
                                  confirmRemove(
                                    `${item.staff_name} from ${item.area_name}`,
                                    () =>
                                      removeStaffArea(
                                        item.id,
                                      ),
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </Box>
                          ),
                        )}
                      </Stack>
                    </Stack>
                  </Box>

                  <Box
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="lg"
                    p="4"
                  >
                    <Stack gap="4">
                      <Box>
                        <Text fontWeight="700">
                          Activity requirement library
                        </Text>

                        <Text
                          fontSize="sm"
                          color="gray.500"
                        >
                          {activityQualifications.length} reusable staffing rule{activityQualifications.length === 1 ? "" : "s"}
                        </Text>
                      </Box>

                      <Box
                        as="form"
                        onSubmit={
                          submitActivityQualification
                        }
                      >
                        <Grid
                          templateColumns={{
                            base: "1fr",
                            md: "minmax(0, 1fr) minmax(0, 1fr) 88px auto",
                          }}
                          gap="3"
                          alignItems="end"
                        >
                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={
                                activityQualActivity
                              }
                              onChange={(
                                event,
                              ) =>
                                setActivityQualActivity(
                                  event.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Choose activity
                              </option>

                              {activities.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {item.name}
                                  </option>
                                ),
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>

                          <NativeSelect.Root>
                            <NativeSelect.Field
                              value={
                                activityQualQual
                              }
                              onChange={(
                                event,
                              ) =>
                                setActivityQualQual(
                                  event.target
                                    .value,
                                )
                              }
                            >
                              <option value="">
                                Choose qualification
                              </option>

                              {qualifications.map(
                                (item) => (
                                  <option
                                    key={
                                      item.id
                                    }
                                    value={
                                      item.id
                                    }
                                  >
                                    {item.name}
                                  </option>
                                ),
                              )}
                            </NativeSelect.Field>

                            <NativeSelect.Indicator />
                          </NativeSelect.Root>

                          <Field.Root>
                            <Field.Label>
                              Required
                            </Field.Label>

                            <Input
                              type="number"
                              min="1"
                              value={
                                requiredCount
                              }
                              onChange={(
                                event,
                              ) =>
                                setRequiredCount(
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </Field.Root>

                          <Button
                            type="submit"
                            colorPalette="green"
                          >
                            Add rule
                          </Button>
                        </Grid>
                      </Box>

                      <Stack gap="2">
                        {activityQualifications.map(
                          (item) => (
                            <Box
                              key={item.id}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              gap="3"
                              py="2"
                              borderTopWidth="1px"
                              borderColor="gray.100"
                            >
                              <Stack gap="0">
                                <Text fontWeight="700">
                                  {
                                    item.activity_name
                                  }
                                </Text>

                                <Text
                                  fontSize="sm"
                                  color="gray.500"
                                >
                                  {item.required_staff_count} × {item.qualification_name}
                                </Text>
                              </Stack>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() =>
                                  confirmRemove(
                                    `${item.qualification_name} requirement from ${item.activity_name}`,
                                    () =>
                                      removeActivityQualification(
                                        item.id,
                                      ),
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </Box>
                          ),
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            </Box>
          </details>
        </Box>
      </Stack>
    </Box>
  );
}
