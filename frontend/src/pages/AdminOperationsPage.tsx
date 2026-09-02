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
  loadActivities,
  loadAreas,
  loadEvents,
  loadEventTypes,
} from "../api/operations";

type View =
  | "areas"
  | "activities"
  | "events";

function localDateTime(
  value: string,
): string {
  return new Date(value).toLocaleString();
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
          new Date(startsAt).toISOString(),
        ends_at:
          new Date(endsAt).toISOString(),
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
                areas.map((area) => (
                  <div
                    className="admin-list-row"
                    key={area.id}
                  >
                    <span>
                      <strong>
                        {area.name}
                      </strong>
                    </span>
                  </div>
                ))
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
                  (activity) => (
                    <div
                      className="admin-list-row"
                      key={activity.id}
                    >
                      <span>
                        <strong>
                          {activity.name}
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

                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) =>
                    setStartsAt(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Ends</span>

                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) =>
                    setEndsAt(
                      event.target.value,
                    )
                  }
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
                events.map((event) => (
                  <div
                    className="admin-list-row operation-event-row"
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
                  </div>
                ))
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
