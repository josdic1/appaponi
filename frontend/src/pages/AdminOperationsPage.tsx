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

import type {
  EventRecord,
  EventType,
} from "@appoponi/shared/schemas/events";

import {
  createActivity,
  createArea,
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
      });

      setActivityName("");
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

  function beginEventEdit(
    item: EventRecord,
  ) {
    setEditingEventId(item.id);
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
    <section>
      <div className="admin-heading">
        <div>
          <div className="admin-eyebrow">
            ADMIN
          </div>

          <h1>Camp operations</h1>

          <p>
            Define the places, reusable
            activities, and events that
            Appoponi schedules.
          </p>
        </div>
      </div>

      <div className="operations-tabs">
        <button
          type="button"
          className={
            view === "events"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("events")
          }
        >
          Events
        </button>

        <button
          type="button"
          className={
            view === "areas"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("areas")
          }
        >
          Areas
        </button>

        <button
          type="button"
          className={
            view === "activities"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("activities")
          }
        >
          Activities
        </button>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {view === "areas" && (
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  Add area
                </strong>
                <span>
                  A real place at camp.
                </span>
              </div>
            </div>

            <form
              className="admin-form"
              onSubmit={submitArea}
            >
              <label>
                <span>Name</span>

                <input
                  value={areaName}
                  onChange={(event) =>
                    setAreaName(
                      event.target.value,
                    )
                  }
                />
              </label>

              <button
                className="admin-primary"
                type="submit"
              >
                Add area
              </button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>Areas</strong>
                <span>
                  {areas.length} total
                </span>
              </div>
            </div>

            <div className="admin-list">
              {areas.length ? (
                areas.map((area) =>
                  editingAreaId ===
                  area.id ? (
                    <form
                      className="admin-inline-edit"
                      key={area.id}
                      onSubmit={(event) =>
                        void saveAreaEdit(
                          event,
                          area.id,
                        )
                      }
                    >
                      <input
                        aria-label="Area name"
                        value={
                          editingAreaName
                        }
                        onChange={(event) =>
                          setEditingAreaName(
                            event.target.value,
                          )
                        }
                      />

                      <div className="admin-row-actions">
                        <button
                          className="admin-secondary-button"
                          type="submit"
                        >
                          Save
                        </button>

                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            setEditingAreaId(
                              null,
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className="admin-list-row admin-manage-row"
                      key={area.id}
                    >
                      <span>
                        <strong>
                          {area.name}
                        </strong>
                      </span>

                      <div className="admin-row-actions">
                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            beginAreaEdit(
                              area,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="admin-delete-button"
                          type="button"
                          onClick={() =>
                            void removeArea(
                              area,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="admin-empty">
                  No areas yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {view === "activities" && (
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  Add activity
                </strong>
                <span>
                  Reusable camp activity.
                </span>
              </div>
            </div>

            <form
              className="admin-form"
              onSubmit={submitActivity}
            >
              <label>
                <span>Name</span>

                <input
                  value={activityName}
                  onChange={(event) =>
                    setActivityName(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Area</span>

                <select
                  value={activityAreaId}
                  onChange={(event) =>
                    setActivityAreaId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Choose area
                  </option>

                  {areas.map((area) => (
                    <option
                      key={area.id}
                      value={area.id}
                    >
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Setting</span>

                <select
                  value={setting}
                  onChange={(event) =>
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
                </select>
              </label>

              <button
                className="admin-primary"
                type="submit"
              >
                Add activity
              </button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  Activities
                </strong>
                <span>
                  {activities.length} total
                </span>
              </div>
            </div>

            <div className="admin-list">
              {activities.length ? (
                activities.map(
                  (activity) =>
                    editingActivityId ===
                    activity.id ? (
                      <form
                        className="admin-list-row profile-edit-row"
                        key={activity.id}
                        onSubmit={(event) =>
                          void saveActivityEdit(
                            event,
                            activity.id,
                          )
                        }
                      >
                        <div className="admin-edit-fields">
                          <input
                            aria-label="Activity name"
                            value={
                              editingActivityName
                            }
                            onChange={(event) =>
                              setEditingActivityName(
                                event.target
                                  .value,
                              )
                            }
                          />

                          <select
                            aria-label="Activity area"
                            value={
                              editingActivityAreaId
                            }
                            onChange={(event) =>
                              setEditingActivityAreaId(
                                event.target
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
                          </select>

                          <select
                            aria-label="Activity setting"
                            value={
                              editingActivitySetting
                            }
                            onChange={(event) =>
                              setEditingActivitySetting(
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
                          </select>
                        </div>

                        <div className="admin-row-actions">
                          <button
                            className="admin-secondary-button"
                            type="submit"
                          >
                            Save
                          </button>

                          <button
                            className="admin-edit-button"
                            type="button"
                            onClick={() =>
                              setEditingActivityId(
                                null,
                              )
                            }
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div
                        className="admin-list-row admin-manage-row"
                        key={activity.id}
                      >
                        <span>
                          <strong>
                            {
                              activity.name
                            }
                          </strong>

                          <small>
                            {
                              activity.area_name
                            }{" "}
                            ·{" "}
                            {
                              activity.setting
                            }
                          </small>
                        </span>

                        <div className="admin-row-actions">
                          <button
                            className="admin-edit-button"
                            type="button"
                            onClick={() =>
                              beginActivityEdit(
                                activity,
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="admin-delete-button"
                            type="button"
                            onClick={() =>
                              void removeActivity(
                                activity,
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ),
                )
              ) : (
                <div className="admin-empty">
                  No activities yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {view === "events" && (
        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>
                  Create event
                </strong>

                <span>
                  The container for a camp
                  stay or gathering.
                </span>
              </div>
            </div>

            <form
              className="admin-form"
              onSubmit={submitEvent}
            >
              <label>
                <span>Name</span>

                <input
                  value={eventName}
                  onChange={(event) =>
                    setEventName(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Event type</span>

                <select
                  value={eventTypeId}
                  onChange={(event) =>
                    setEventTypeId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Choose type
                  </option>

                  {eventTypes.map(
                    (eventType) => (
                      <option
                        key={eventType.id}
                        value={eventType.id}
                      >
                        {eventType.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {selectedEventType?.name ===
                "Other" && (
                <>
                  <label>
                    <span>
                      Other type
                    </span>

                    <input
                      value={otherValue}
                      onChange={(event) =>
                        setOtherValue(
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>
                      Why isn't an existing
                      type right?
                    </span>

                    <input
                      value={otherReason}
                      onChange={(event) =>
                        setOtherReason(
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>
                </>
              )}

              <label>
                <span>Starts</span>

                <HumanDateTimeInput
                  value={startsAt}
                  onChange={setStartsAt}
                />
              </label>

              <label>
                <span>Ends</span>

                <HumanDateTimeInput
                  value={endsAt}
                  onChange={setEndsAt}
                  defaultDate={startsAt}
                />
              </label>

              <button
                className="admin-primary"
                type="submit"
              >
                Create event
              </button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <strong>Events</strong>
                <span>
                  {events.length} total
                </span>
              </div>
            </div>

            <div className="admin-list">
              {events.length ? (
                events.map((event) =>
                  editingEventId ===
                  event.id ? (
                    <form
                      className="admin-list-row profile-edit-row operation-event-edit"
                      key={event.id}
                      onSubmit={(formEvent) =>
                        void saveEventEdit(
                          formEvent,
                          event.id,
                        )
                      }
                    >
                      <div className="admin-edit-fields operation-event-edit-fields">
                        <input
                          aria-label="Event name"
                          value={
                            editingEventName
                          }
                          onChange={(
                            inputEvent,
                          ) =>
                            setEditingEventName(
                              inputEvent.target
                                .value,
                            )
                          }
                        />

                        <select
                          aria-label="Event type"
                          value={
                            editingEventTypeId
                          }
                          onChange={(
                            inputEvent,
                          ) =>
                            setEditingEventTypeId(
                              inputEvent.target
                                .value,
                            )
                          }
                        >
                          {eventTypes.map(
                            (eventType) => (
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
                        </select>

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
                            <input
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

                            <input
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
                      </div>

                      <div className="admin-row-actions">
                        <button
                          className="admin-secondary-button"
                          type="submit"
                        >
                          Save
                        </button>

                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            setEditingEventId(
                              null,
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className="admin-list-row operation-event-row admin-manage-row"
                      key={event.id}
                    >
                      <span>
                        <strong>
                          {event.name}
                        </strong>

                        <small>
                          {
                            event.event_type_name
                          }{" "}
                          ·{" "}
                          {localDateTime(
                            event.starts_at,
                          )}
                        </small>
                      </span>

                      <div className="admin-row-actions">
                        <button
                          className="admin-edit-button"
                          type="button"
                          onClick={() =>
                            beginEventEdit(
                              event,
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="admin-delete-button"
                          type="button"
                          onClick={() =>
                            void removeEvent(
                              event,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )
              ) : (
                <div className="admin-empty">
                  No events yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
