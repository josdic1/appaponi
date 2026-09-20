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
} from "@chakra-ui/react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  Area,
} from "@appoponi/shared/schemas/areas";

import type {
  Activity,
  ActivitySetting,
} from "@appoponi/shared/schemas/activities";

import {
  CAMP_MAP_PLACE_IDS,
  CAMP_MAP_PLACE_LABELS,
  type CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

import type {
  EventRecord,
  EventType,
} from "@appoponi/shared/schemas/events";

import {
  createActivity,
  createArea,
  cloneEvent,
  createEvent,
  deleteActivity,
  deleteArea,
  deleteEvent,
  loadActivities,
  loadAreas,
  loadEvents,
  loadEventTypes,
  updateActivity,
  updateArea,
  updateEvent,
} from "../api/operations";

import HumanDateTimeInput from "../components/HumanDateTimeInput";
import {
  humanDateTimeToIso,
} from "../lib/humanDateTime";

import { AdminPageHeader } from "../components/AdminUi";

type View =
  | "areas"
  | "activities"
  | "events";

function localDateTime(
  value: string,
): string {
  return new Date(value).toLocaleString();
}

function editableDateTime(
  value: string,
): string {
  const date = new Date(value);
  let hour = date.getHours();
  const meridiem =
    hour >= 12 ? "PM" : "AM";

  hour %= 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${
    date.getMonth() + 1
  }/${date.getDate()}/${date.getFullYear()} ${hour}:${String(
    date.getMinutes(),
  ).padStart(2, "0")} ${meridiem}`;
}

export default function AdminOperationsPage() {
  const [view, setView] =
    useState<View>("events");

  const [showEventCreate, setShowEventCreate] =
    useState(false);

  const [showAreaCreate, setShowAreaCreate] =
    useState(false);

  const [showActivityCreate, setShowActivityCreate] =
    useState(false);

  const [areas, setAreas] =
    useState<Area[]>([]);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [eventTypes, setEventTypes] =
    useState<EventType[]>([]);

  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [areaName, setAreaName] =
    useState("");

  const [activityName, setActivityName] =
    useState("");

  const [activityAreaId, setActivityAreaId] =
    useState("");

  const [setting, setSetting] =
    useState<ActivitySetting>("outside");

  const [activityMapPlaceId, setActivityMapPlaceId] =
    useState<CampMapPlaceId | "">("");

  const [eventName, setEventName] =
    useState("");

  const [eventTypeId, setEventTypeId] =
    useState("");

  const [startsAt, setStartsAt] =
    useState("");

  const [endsAt, setEndsAt] =
    useState("");

  const [otherValue, setOtherValue] =
    useState("");

  const [otherReason, setOtherReason] =
    useState("");

  const [editingAreaId, setEditingAreaId] =
    useState<string | null>(null);

  const [editingAreaName, setEditingAreaName] =
    useState("");

  const [
    editingActivityId,
    setEditingActivityId,
  ] = useState<string | null>(null);

  const [
    editingActivityName,
    setEditingActivityName,
  ] = useState("");

  const [
    editingActivityAreaId,
    setEditingActivityAreaId,
  ] = useState("");

  const [
    editingActivitySetting,
    setEditingActivitySetting,
  ] = useState<ActivitySetting>("outside");

  const [
    editingActivityMapPlaceId,
    setEditingActivityMapPlaceId,
  ] = useState<CampMapPlaceId | "">("");

  const [editingEventId, setEditingEventId] =
    useState<string | null>(null);

  const [editingEventName, setEditingEventName] =
    useState("");

  const [
    editingEventTypeId,
    setEditingEventTypeId,
  ] = useState("");

  const [
    editingStartsAt,
    setEditingStartsAt,
  ] = useState("");

  const [
    editingEndsAt,
    setEditingEndsAt,
  ] = useState("");

  const [
    editingOtherValue,
    setEditingOtherValue,
  ] = useState("");

  const [
    editingOtherReason,
    setEditingOtherReason,
  ] = useState("");

  const [
    cloningEventId,
    setCloningEventId,
  ] = useState<string | null>(null);

  const [cloneEventName, setCloneEventName] =
    useState("");

  const [cloneStartsAt, setCloneStartsAt] =
    useState("");

  async function refresh() {
    const [
      nextAreas,
      nextActivities,
      nextEventTypes,
      nextEvents,
    ] = await Promise.all([
      loadAreas(),
      loadActivities(),
      loadEventTypes(),
      loadEvents(),
    ]);

    setAreas(nextAreas);
    setActivities(nextActivities);
    setEventTypes(nextEventTypes);
    setEvents(nextEvents);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load operations",
      );
    });
  }, []);

  const selectedEventType =
    useMemo(
      () =>
        eventTypes.find(
          (item) =>
            item.id === eventTypeId,
        ) ?? null,
      [eventTypes, eventTypeId],
    );

  const selectedEditingEventType =
    useMemo(
      () =>
        eventTypes.find(
          (item) =>
            item.id ===
            editingEventTypeId,
        ) ?? null,
      [
        eventTypes,
        editingEventTypeId,
      ],
    );

  async function submitArea(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    try {
      await createArea(areaName);
      setAreaName("");
      setShowAreaCreate(false);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create area",
      );
    }
  }

  async function submitActivity(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    if (!activityAreaId) {
      setError("Choose an area.");
      return;
    }

    try {
      await createActivity({
        name: activityName,
        area_id:
          Number(activityAreaId),
        setting,
        map_place_id: activityMapPlaceId || null,
      });

      setActivityName("");
      setActivityMapPlaceId("");
      setShowActivityCreate(false);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create activity",
      );
    }
  }

  async function submitEvent(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError(null);

    if (!eventTypeId) {
      setError("Choose an event type.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError(
        "Start and end are required.",
      );
      return;
    }

    try {
      await createEvent({
        name: eventName,
        event_type_id:
          Number(eventTypeId),
        starts_at:
          humanDateTimeToIso(
            startsAt,
          ),
        ends_at:
          humanDateTimeToIso(
            endsAt,
            startsAt,
          ),
        ...(selectedEventType?.name ===
        "Other"
          ? {
              other_value:
                otherValue,
              other_reason:
                otherReason,
            }
          : {}),
      });

      setEventName("");
      setStartsAt("");
      setEndsAt("");
      setOtherValue("");
      setOtherReason("");
      setShowEventCreate(false);

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create event",
      );
    }
  }

  function beginAreaEdit(
    area: Area,
  ) {
    setEditingAreaId(area.id);
    setEditingAreaName(area.name);
    setError(null);
  }

  async function saveAreaEdit(
    event: FormEvent,
    id: string,
  ) {
    event.preventDefault();
    setError(null);

    try {
      await updateArea(id, {
        name: editingAreaName,
      });

      setEditingAreaId(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update area",
      );
    }
  }

  async function removeArea(
    area: Area,
  ) {
    if (
      !window.confirm(
        `Delete area "${area.name}"?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      await deleteArea(area.id);

      if (editingAreaId === area.id) {
        setEditingAreaId(null);
      }

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete area",
      );
    }
  }

  function beginActivityEdit(
    activity: Activity,
  ) {
    setEditingActivityId(activity.id);
    setEditingActivityName(
      activity.name,
    );
    setEditingActivityAreaId(
      activity.area_id,
    );
    setEditingActivitySetting(
      activity.setting,
    );
    setEditingActivityMapPlaceId(
      activity.map_place_id ?? "",
    );
    setError(null);
  }

  async function saveActivityEdit(
    event: FormEvent,
    id: string,
  ) {
    event.preventDefault();
    setError(null);

    if (!editingActivityAreaId) {
      setError("Choose an area.");
      return;
    }

    try {
      await updateActivity(id, {
        name: editingActivityName,
        area_id:
          Number(
            editingActivityAreaId,
          ),
        setting:
          editingActivitySetting,
        map_place_id:
          editingActivityMapPlaceId || null,
      });

      setEditingActivityId(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update activity",
      );
    }
  }

  async function removeActivity(
    activity: Activity,
  ) {
    if (
      !window.confirm(
        `Delete activity "${activity.name}"?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      await deleteActivity(
        activity.id,
      );

      if (
        editingActivityId ===
        activity.id
      ) {
        setEditingActivityId(null);
      }

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete activity",
      );
    }
  }

  function nextCloneName(name: string) {
    const matches = [...name.matchAll(/\b(20\d{2})\b/g)];
    const last = matches.at(-1);

    if (!last) {
      return `${name} Copy`;
    }

    const year = Number(last[1]);
    const index = last.index ?? 0;

    return `${name.slice(0, index)}${year + 1}${name.slice(
      index + last[1].length,
    )}`;
  }

  function defaultCloneStart(value: string) {
    const next = new Date(value);
    next.setDate(next.getDate() + 364);
    return editableDateTime(next.toISOString());
  }

  function beginEventClone(item: EventRecord) {
    setCloningEventId(item.id);
    setCloneEventName(nextCloneName(item.name));
    setCloneStartsAt(defaultCloneStart(item.starts_at));
    setEditingEventId(null);
    setError(null);
  }

  async function submitEventClone(
    event: FormEvent,
    sourceId: string,
  ) {
    event.preventDefault();
    setError(null);

    if (!cloneStartsAt) {
      setError("New start is required.");
      return;
    }

    try {
      await cloneEvent(sourceId, {
        name: cloneEventName,
        starts_at: humanDateTimeToIso(cloneStartsAt),
      });

      setCloningEventId(null);
      setCloneEventName("");
      setCloneStartsAt("");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not clone event",
      );
    }
  }

  function beginEventEdit(
    item: EventRecord,
  ) {
    setEditingEventId(item.id);
    setCloningEventId(null);
    setEditingEventName(item.name);
    setEditingEventTypeId(
      item.event_type_id,
    );
    setEditingStartsAt(
      editableDateTime(
        item.starts_at,
      ),
    );
    setEditingEndsAt(
      editableDateTime(
        item.ends_at,
      ),
    );
    setEditingOtherValue(
      item.other_value ?? "",
    );
    setEditingOtherReason(
      item.other_reason ?? "",
    );
    setError(null);
  }

  async function saveEventEdit(
    event: FormEvent,
    id: string,
  ) {
    event.preventDefault();
    setError(null);

    if (!editingEventTypeId) {
      setError("Choose an event type.");
      return;
    }

    if (
      !editingStartsAt ||
      !editingEndsAt
    ) {
      setError(
        "Start and end are required.",
      );
      return;
    }

    try {
      await updateEvent(id, {
        name: editingEventName,
        event_type_id:
          Number(
            editingEventTypeId,
          ),
        starts_at:
          humanDateTimeToIso(
            editingStartsAt,
          ),
        ends_at:
          humanDateTimeToIso(
            editingEndsAt,
            editingStartsAt,
          ),
        ...(selectedEditingEventType
          ?.name === "Other"
          ? {
              other_value:
                editingOtherValue,
              other_reason:
                editingOtherReason,
            }
          : {}),
      });

      setEditingEventId(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update event",
      );
    }
  }

  async function removeEvent(
    item: EventRecord,
  ) {
    if (
      !window.confirm(
        `Delete event "${item.name}"?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      await deleteEvent(item.id);

      if (editingEventId === item.id) {
        setEditingEventId(null);
      }

      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete event",
      );
    }
  }

  return (
    <Box
      as="section"
      w="full"
    >
      <Stack gap="6">
        <AdminPageHeader
          eyebrow="Admin"
          title="Events & libraries"
          description="Build events from reusable places and activities."
        />

        <HStack
          gap="2"
          flexWrap="wrap"
        >
          <Button
            type="button"
            size="sm"
            colorPalette="green"
            variant={
              view === "events"
                ? "solid"
                : "outline"
            }
            onClick={() =>
              setView("events")
            }
          >
            Events
          </Button>

          <Button
            type="button"
            size="sm"
            colorPalette="green"
            variant={
              view === "areas"
                ? "solid"
                : "outline"
            }
            onClick={() =>
              setView("areas")
            }
          >
            Place library
          </Button>

          <Button
            type="button"
            size="sm"
            colorPalette="green"
            variant={
              view === "activities"
                ? "solid"
                : "outline"
            }
            onClick={() =>
              setView("activities")
            }
          >
            Activity library
          </Button>
        </HStack>

        <Box
          display="flex"
          flexDirection={{
            base: "column",
            md: "row",
          }}
          alignItems={{
            base: "stretch",
            md: "center",
          }}
          justifyContent="space-between"
          gap="4"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          bg="white"
          p="4"
        >
          <Stack gap="0">
            <Text fontWeight="700">
              {view === "events"
                ? "Events"
                : view === "areas"
                  ? "Place library"
                  : "Activity library"}
            </Text>

            <Text
              fontSize="sm"
              color="gray.500"
            >
              {view === "events"
                ? `${events.length} persistent event${events.length === 1 ? "" : "s"}. Event categories are reusable.`
                : view === "areas"
                  ? `${areas.length} reusable place${areas.length === 1 ? "" : "s"} available to every event.`
                  : `${activities.length} reusable activit${activities.length === 1 ? "y" : "ies"} available to every event.`}
            </Text>
          </Stack>

          <Button
            type="button"
            colorPalette="green"
            onClick={() => {
              if (view === "events") {
                setShowEventCreate(
                  (current) => !current,
                );
              } else if (
                view === "areas"
              ) {
                setShowAreaCreate(
                  (current) => !current,
                );
              } else {
                setShowActivityCreate(
                  (current) => !current,
                );
              }
            }}
          >
            {view === "events"
              ? showEventCreate
                ? "Close"
                : "New event"
              : view === "areas"
                ? showAreaCreate
                  ? "Close"
                  : "New place"
                : showActivityCreate
                  ? "Close"
                  : "New activity"}
          </Button>
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

        {view === "areas" && (
          <Grid
            templateColumns={
              showAreaCreate
                ? {
                    base: "1fr",
                    lg: "360px minmax(0, 1fr)",
                  }
                : "1fr"
            }
            gap="5"
            alignItems="start"
          >
            {showAreaCreate && (
              <Box
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                bg="white"
                p={{ base: "4", md: "5" }}
              >
                <Stack gap="5">
                  <Box>
                    <Text fontWeight="700">
                      Add place
                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.500"
                    >
                      Reusable physical location.
                    </Text>
                  </Box>

                  <Box
                    as="form"
                    onSubmit={submitArea}
                  >
                    <Stack gap="4">
                      <Field.Root>
                        <Field.Label>
                          Name
                        </Field.Label>

                        <Input
                          value={areaName}
                          onChange={(event) =>
                            setAreaName(
                              event.target.value,
                            )
                          }
                        />
                      </Field.Root>

                      <Button
                        type="submit"
                        colorPalette="green"
                      >
                        Add place
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
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
                  Place library
                </Text>

                <Text
                  fontSize="sm"
                  color="gray.500"
                >
                  {areas.length} total
                </Text>
              </Box>

              {areas.length ? (
                <Stack gap="0">
                  {areas.map((area) =>
                    editingAreaId ===
                    area.id ? (
                      <Box
                        as="form"
                        key={area.id}
                        onSubmit={(event) =>
                          void saveAreaEdit(
                            event,
                            area.id,
                          )
                        }
                        px="5"
                        py="4"
                        bg="gray.50"
                        borderBottomWidth="1px"
                        borderColor="gray.200"
                      >
                        <Stack gap="3">
                          <Input
                            aria-label="Area name"
                            value={
                              editingAreaName
                            }
                            onChange={(event) =>
                              setEditingAreaName(
                                event.target
                                  .value,
                              )
                            }
                          />

                          <HStack>
                            <Button
                              type="submit"
                              size="sm"
                              colorPalette="green"
                            >
                              Save
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingAreaId(
                                  null,
                                )
                              }
                            >
                              Cancel
                            </Button>
                          </HStack>
                        </Stack>
                      </Box>
                    ) : (
                      <Box
                        key={area.id}
                        px="5"
                        py="4"
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                      >
                        <Box
                          display="flex"
                          flexDirection={{
                            base: "column",
                            md: "row",
                          }}
                          alignItems={{
                            base: "stretch",
                            md: "center",
                          }}
                          justifyContent="space-between"
                          gap="4"
                        >
                          <Text fontWeight="700">
                            {area.name}
                          </Text>

                          <HStack>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                beginAreaEdit(
                                  area,
                                )
                              }
                            >
                              Edit
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              colorPalette="red"
                              onClick={() =>
                                void removeArea(
                                  area,
                                )
                              }
                            >
                              Delete
                            </Button>
                          </HStack>
                        </Box>
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
                    No areas yet.
                  </Text>
                </Box>
              )}
            </Box>
          </Grid>
        )}

        {view === "activities" && (
          <Grid
            templateColumns={
              showActivityCreate
                ? {
                    base: "1fr",
                    lg: "360px minmax(0, 1fr)",
                  }
                : "1fr"
            }
            gap="5"
            alignItems="start"
          >
            {showActivityCreate && (
              <Box
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                bg="white"
                p={{ base: "4", md: "5" }}
              >
                <Stack gap="5">
                  <Box>
                    <Text fontWeight="700">
                      Add activity
                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.500"
                    >
                      Reusable activity definition. Schedule it inside any event.
                    </Text>
                  </Box>

                  <Box
                    as="form"
                    onSubmit={
                      submitActivity
                    }
                  >
                    <Stack gap="4">
                      <Field.Root>
                        <Field.Label>
                          Name
                        </Field.Label>

                        <Input
                          value={
                            activityName
                          }
                          onChange={(event) =>
                            setActivityName(
                              event.target
                                .value,
                            )
                          }
                        />
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          Area
                        </Field.Label>

                        <NativeSelect.Root>
                          <NativeSelect.Field
                            value={
                              activityAreaId
                            }
                            onChange={(
                              event,
                            ) =>
                              setActivityAreaId(
                                event.target
                                  .value,
                              )
                            }
                          >
                            <option value="">
                              Choose area
                            </option>

                            {areas.map(
                              (area) => (
                                <option
                                  key={
                                    area.id
                                  }
                                  value={
                                    area.id
                                  }
                                >
                                  {
                                    area.name
                                  }
                                </option>
                              ),
                            )}
                          </NativeSelect.Field>

                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          Setting
                        </Field.Label>

                        <NativeSelect.Root>
                          <NativeSelect.Field
                            value={setting}
                            onChange={(
                              event,
                            ) =>
                              setSetting(
                                event.target
                                  .value as ActivitySetting,
                              )
                            }
                          >
                            <option value="outside">
                              Outside
                            </option>

                            <option value="inside">
                              Inside
                            </option>

                            <option value="other">
                              Other
                            </option>
                          </NativeSelect.Field>

                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          Map place
                        </Field.Label>

                        <NativeSelect.Root>
                          <NativeSelect.Field
                            value={
                              activityMapPlaceId
                            }
                            onChange={(
                              event,
                            ) =>
                              setActivityMapPlaceId(
                                event.target
                                  .value as CampMapPlaceId | "",
                              )
                            }
                          >
                            <option value="">
                              Not on map
                            </option>

                            {CAMP_MAP_PLACE_IDS.map(
                              (placeId) => (
                                <option
                                  key={
                                    placeId
                                  }
                                  value={
                                    placeId
                                  }
                                >
                                  {
                                    CAMP_MAP_PLACE_LABELS[
                                      placeId
                                    ]
                                  }
                                </option>
                              ),
                            )}
                          </NativeSelect.Field>

                          <NativeSelect.Indicator />
                        </NativeSelect.Root>
                      </Field.Root>

                      <Button
                        type="submit"
                        colorPalette="green"
                      >
                        Add activity
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
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
                  Activity library
                </Text>

                <Text
                  fontSize="sm"
                  color="gray.500"
                >
                  {activities.length} total
                </Text>
              </Box>

              {activities.length ? (
                <Stack gap="0">
                  {activities.map(
                    (activity) =>
                      editingActivityId ===
                      activity.id ? (
                        <Box
                          as="form"
                          key={
                            activity.id
                          }
                          onSubmit={(
                            event,
                          ) =>
                            void saveActivityEdit(
                              event,
                              activity.id,
                            )
                          }
                          px="5"
                          py="4"
                          bg="gray.50"
                          borderBottomWidth="1px"
                          borderColor="gray.200"
                        >
                          <Stack gap="3">
                            <Grid
                              templateColumns={{
                                base: "1fr",
                                md: "repeat(2, minmax(0, 1fr))",
                              }}
                              gap="3"
                            >
                              <Input
                                aria-label="Activity name"
                                value={
                                  editingActivityName
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEditingActivityName(
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              />

                              <NativeSelect.Root>
                                <NativeSelect.Field
                                  aria-label="Activity area"
                                  value={
                                    editingActivityAreaId
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditingActivityAreaId(
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                >
                                  {areas.map(
                                    (area) => (
                                      <option
                                        key={
                                          area.id
                                        }
                                        value={
                                          area.id
                                        }
                                      >
                                        {
                                          area.name
                                        }
                                      </option>
                                    ),
                                  )}
                                </NativeSelect.Field>

                                <NativeSelect.Indicator />
                              </NativeSelect.Root>

                              <NativeSelect.Root>
                                <NativeSelect.Field
                                  aria-label="Activity setting"
                                  value={
                                    editingActivitySetting
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditingActivitySetting(
                                      event
                                        .target
                                        .value as ActivitySetting,
                                    )
                                  }
                                >
                                  <option value="outside">
                                    Outside
                                  </option>

                                  <option value="inside">
                                    Inside
                                  </option>

                                  <option value="other">
                                    Other
                                  </option>
                                </NativeSelect.Field>

                                <NativeSelect.Indicator />
                              </NativeSelect.Root>

                              <NativeSelect.Root>
                                <NativeSelect.Field
                                  aria-label="Activity map place"
                                  value={
                                    editingActivityMapPlaceId
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    setEditingActivityMapPlaceId(
                                      event
                                        .target
                                        .value as CampMapPlaceId | "",
                                    )
                                  }
                                >
                                  <option value="">
                                    Not on map
                                  </option>

                                  {CAMP_MAP_PLACE_IDS.map(
                                    (
                                      placeId,
                                    ) => (
                                      <option
                                        key={
                                          placeId
                                        }
                                        value={
                                          placeId
                                        }
                                      >
                                        {
                                          CAMP_MAP_PLACE_LABELS[
                                            placeId
                                          ]
                                        }
                                      </option>
                                    ),
                                  )}
                                </NativeSelect.Field>

                                <NativeSelect.Indicator />
                              </NativeSelect.Root>
                            </Grid>

                            <HStack>
                              <Button
                                type="submit"
                                size="sm"
                                colorPalette="green"
                              >
                                Save
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingActivityId(
                                    null,
                                  )
                                }
                              >
                                Cancel
                              </Button>
                            </HStack>
                          </Stack>
                        </Box>
                      ) : (
                        <Box
                          key={
                            activity.id
                          }
                          px="5"
                          py="4"
                          borderBottomWidth="1px"
                          borderColor="gray.100"
                        >
                          <Box
                            display="flex"
                            flexDirection={{
                              base: "column",
                              md: "row",
                            }}
                            alignItems={{
                              base: "stretch",
                              md: "center",
                            }}
                            justifyContent="space-between"
                            gap="4"
                          >
                            <Stack gap="0">
                              <Text fontWeight="700">
                                {
                                  activity.name
                                }
                              </Text>

                              <Text
                                fontSize="sm"
                                color="gray.500"
                              >
                                {
                                  activity.area_name
                                }{" "}
                                ·{" "}
                                {
                                  activity.setting
                                }
                                {activity.map_place_id
                                  ? ` · ${
                                      CAMP_MAP_PLACE_LABELS[
                                        activity.map_place_id
                                      ]
                                    }`
                                  : ""}
                              </Text>
                            </Stack>

                            <HStack>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  beginActivityEdit(
                                    activity,
                                  )
                                }
                              >
                                Edit
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                colorPalette="red"
                                onClick={() =>
                                  void removeActivity(
                                    activity,
                                  )
                                }
                              >
                                Delete
                              </Button>
                            </HStack>
                          </Box>
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
                    No activities yet.
                  </Text>
                </Box>
              )}
            </Box>
          </Grid>
        )}

        {view === "events" && (
          <Grid
            templateColumns={
              showEventCreate
                ? {
                    base: "1fr",
                    lg: "380px minmax(0, 1fr)",
                  }
                : "1fr"
            }
            gap="5"
            alignItems="start"
          >
            {showEventCreate && (
              <Box
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                bg="white"
                p={{ base: "4", md: "5" }}
              >
                <Stack gap="5">
                  <Box>
                    <Text fontWeight="700">
                      Create event
                    </Text>

                    <Text
                      fontSize="sm"
                      color="gray.500"
                    >
                      The container for a camp stay or gathering.
                    </Text>
                  </Box>

                  <Box
                    as="form"
                    onSubmit={
                      submitEvent
                    }
                  >
                    <Stack gap="4">
                      <Field.Root>
                        <Field.Label>
                          Name
                        </Field.Label>

                        <Input
                          value={
                            eventName
                          }
                          onChange={(event) =>
                            setEventName(
                              event.target
                                .value,
                            )
                          }
                        />
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          Event category
                        </Field.Label>

                        <NativeSelect.Root>
                          <NativeSelect.Field
                            value={
                              eventTypeId
                            }
                            onChange={(
                              event,
                            ) =>
                              setEventTypeId(
                                event.target
                                  .value,
                              )
                            }
                          >
                            <option value="">
                              Choose type
                            </option>

                            {eventTypes.map(
                              (
                                eventType,
                              ) => (
                                <option
                                  key={
                                    eventType.id
                                  }
                                  value={
                                    eventType.id
                                  }
                                >
                                  {
                                    eventType.name
                                  }
                                </option>
                              ),
                            )}
                          </NativeSelect.Field>

                          <NativeSelect.Indicator />
                        </NativeSelect.Root>

                        <Field.HelperText>
                          A category is reusable. Family Camp 2026 and Family Camp 2027 can both use Family Camp.
                        </Field.HelperText>
                      </Field.Root>

                      {selectedEventType
                        ?.name ===
                        "Other" && (
                        <>
                          <Field.Root>
                            <Field.Label>
                              Other type
                            </Field.Label>

                            <Input
                              value={
                                otherValue
                              }
                              onChange={(
                                event,
                              ) =>
                                setOtherValue(
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </Field.Root>

                          <Field.Root>
                            <Field.Label>
                              Why isn't an existing type right?
                            </Field.Label>

                            <Input
                              value={
                                otherReason
                              }
                              onChange={(
                                event,
                              ) =>
                                setOtherReason(
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </Field.Root>
                        </>
                      )}

                      <Field.Root>
                        <Field.Label>
                          Starts
                        </Field.Label>

                        <HumanDateTimeInput
                          value={
                            startsAt
                          }
                          onChange={
                            setStartsAt
                          }
                        />
                      </Field.Root>

                      <Field.Root>
                        <Field.Label>
                          Ends
                        </Field.Label>

                        <HumanDateTimeInput
                          value={endsAt}
                          onChange={
                            setEndsAt
                          }
                          defaultDate={
                            startsAt
                          }
                        />
                      </Field.Root>

                      <Button
                        type="submit"
                        colorPalette="green"
                      >
                        Create event
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
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
                  Events
                </Text>

                <Text
                  fontSize="sm"
                  color="gray.500"
                >
                  {events.length} total
                </Text>
              </Box>

              {events.length ? (
                <Stack gap="0">
                  {events.map((event) =>
                    editingEventId ===
                    event.id ? (
                      <Box
                        as="form"
                        key={event.id}
                        onSubmit={(
                          formEvent,
                        ) =>
                          void saveEventEdit(
                            formEvent,
                            event.id,
                          )
                        }
                        px="5"
                        py="4"
                        bg="gray.50"
                        borderBottomWidth="1px"
                        borderColor="gray.200"
                      >
                        <Stack gap="3">
                          <Grid
                            templateColumns={{
                              base: "1fr",
                              md: "repeat(2, minmax(0, 1fr))",
                            }}
                            gap="3"
                          >
                            <Input
                              aria-label="Event name"
                              value={
                                editingEventName
                              }
                              onChange={(
                                inputEvent,
                              ) =>
                                setEditingEventName(
                                  inputEvent
                                    .target
                                    .value,
                                )
                              }
                            />

                            <NativeSelect.Root>
                              <NativeSelect.Field
                                aria-label="Event category"
                                value={
                                  editingEventTypeId
                                }
                                onChange={(
                                  inputEvent,
                                ) =>
                                  setEditingEventTypeId(
                                    inputEvent
                                      .target
                                      .value,
                                  )
                                }
                              >
                                {eventTypes.map(
                                  (
                                    eventType,
                                  ) => (
                                    <option
                                      key={
                                        eventType.id
                                      }
                                      value={
                                        eventType.id
                                      }
                                    >
                                      {
                                        eventType.name
                                      }
                                    </option>
                                  ),
                                )}
                              </NativeSelect.Field>

                              <NativeSelect.Indicator />
                            </NativeSelect.Root>

                            <HumanDateTimeInput
                              value={
                                editingStartsAt
                              }
                              onChange={
                                setEditingStartsAt
                              }
                            />

                            <HumanDateTimeInput
                              value={
                                editingEndsAt
                              }
                              onChange={
                                setEditingEndsAt
                              }
                              defaultDate={
                                editingStartsAt
                              }
                            />

                            {selectedEditingEventType
                              ?.name ===
                              "Other" && (
                              <>
                                <Input
                                  aria-label="Other event type"
                                  placeholder="Other type"
                                  value={
                                    editingOtherValue
                                  }
                                  onChange={(
                                    inputEvent,
                                  ) =>
                                    setEditingOtherValue(
                                      inputEvent
                                        .target
                                        .value,
                                    )
                                  }
                                />

                                <Input
                                  aria-label="Other event reason"
                                  placeholder="Why isn't an existing type right?"
                                  value={
                                    editingOtherReason
                                  }
                                  onChange={(
                                    inputEvent,
                                  ) =>
                                    setEditingOtherReason(
                                      inputEvent
                                        .target
                                        .value,
                                    )
                                  }
                                />
                              </>
                            )}
                          </Grid>

                          <HStack>
                            <Button
                              type="submit"
                              size="sm"
                              colorPalette="green"
                            >
                              Save
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingEventId(
                                  null,
                                )
                              }
                            >
                              Cancel
                            </Button>
                          </HStack>
                        </Stack>
                      </Box>
                    ) : cloningEventId ===
                      event.id ? (
                      <Box
                        as="form"
                        key={event.id}
                        onSubmit={(
                          formEvent,
                        ) =>
                          void submitEventClone(
                            formEvent,
                            event.id,
                          )
                        }
                        px="5"
                        py="4"
                        bg="gray.50"
                        borderBottomWidth="1px"
                        borderColor="gray.200"
                      >
                        <Stack gap="4">
                          <Grid
                            templateColumns={{
                              base: "1fr",
                              md: "repeat(2, minmax(0, 1fr))",
                            }}
                            gap="3"
                          >
                            <Field.Root>
                              <Field.Label>
                                New event name
                              </Field.Label>

                              <Input
                                autoFocus
                                value={
                                  cloneEventName
                                }
                                onChange={(
                                  inputEvent,
                                ) =>
                                  setCloneEventName(
                                    inputEvent
                                      .target
                                      .value,
                                  )
                                }
                              />
                            </Field.Root>

                            <Field.Root>
                              <Field.Label>
                                New start
                              </Field.Label>

                              <HumanDateTimeInput
                                value={
                                  cloneStartsAt
                                }
                                onChange={
                                  setCloneStartsAt
                                }
                              />
                            </Field.Root>
                          </Grid>

                          <HStack>
                            <Button
                              type="submit"
                              size="sm"
                              colorPalette="green"
                            >
                              Clone event
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setCloningEventId(
                                  null,
                                )
                              }
                            >
                              Cancel
                            </Button>
                          </HStack>
                        </Stack>
                      </Box>
                    ) : (
                      <Box
                        key={event.id}
                        px="5"
                        py="4"
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                      >
                        <Box
                          display="flex"
                          flexDirection={{
                            base: "column",
                            xl: "row",
                          }}
                          alignItems={{
                            base: "stretch",
                            xl: "center",
                          }}
                          justifyContent="space-between"
                          gap="4"
                        >
                          <Stack gap="0">
                            <Text fontWeight="700">
                              {event.name}
                            </Text>

                            <Text
                              fontSize="sm"
                              color="gray.500"
                            >
                              {
                                event.event_type_name
                              }{" "}
                              ·{" "}
                              {localDateTime(
                                event.starts_at,
                              )}
                            </Text>
                          </Stack>

                          <HStack
                            flexWrap="wrap"
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                beginEventClone(
                                  event,
                                )
                              }
                            >
                              Clone
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                beginEventEdit(
                                  event,
                                )
                              }
                            >
                              Edit
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              colorPalette="red"
                              onClick={() =>
                                void removeEvent(
                                  event,
                                )
                              }
                            >
                              Delete
                            </Button>
                          </HStack>
                        </Box>
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
                    No events yet.
                  </Text>
                </Box>
              )}
            </Box>
          </Grid>
        )}
      </Stack>
    </Box>
  );
}
