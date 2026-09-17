import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  EventHqSummary,
  EventRecord,
} from "@appoponi/shared/schemas/events";

import {
  loadEventHq,
  loadEvents,
} from "../api/operations";

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

  return (
    <section className="event-hq">
      <div className="event-hq-heading">
        <div>
          <div className="admin-eyebrow">
            EVENT HQ
          </div>

          <h1>
            {hq?.event.name ??
              "Event HQ"}
          </h1>

          {hq && (
            <p>
              {hq.event.event_type_name}
              {" · "}
              {eventDateRange(
                hq.event,
              )}
            </p>
          )}
        </div>

        {events.length > 1 && (
          <label className="event-hq-selector">
            <span>Event</span>

            <select
              value={selectedEventId}
              onChange={(event) => {
                const next = event.target.value;
                setSelectedEventId(next);
                onActiveEventChange?.(next);
              }}
            >
              {events.map(
                (event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {event.name}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
      </div>

      {error && (
        <div className="app-alert app-alert-danger">
          {error}
        </div>
      )}

      {loading && !hq ? (
        <div className="app-empty">
          Loading Event HQ…
        </div>
      ) : !hq ? (
        <section className="app-empty-state">
          <strong>No event yet</strong>

          <span>
            Create your first event to start using Event HQ.
          </span>

          <button
            type="button"
            className="app-button app-button-primary"
            onClick={() =>
              onNavigate(
                "operations",
              )
            }
          >
            Create event
          </button>
        </section>
      ) : (
        <>
          <div className="event-hq-metrics event-hq-metrics-compact">
            <article>
              <span>Guests</span>
              <strong>
                {hq.metrics.people}/{hq.metrics.paid_spots}
              </strong>
              <small>attending / paid</small>
            </article>

            <article>
              <span>Cabins</span>
              <strong>
                {hq.metrics.cabins_assigned}/{hq.metrics.households}
              </strong>
              <small>households placed</small>
            </article>

            <article>
              <span>Staffing</span>
              <strong>
                {Math.max(
                  hq.metrics.activities - hq.metrics.unstaffed_activities,
                  0,
                )}/{hq.metrics.activities}
              </strong>
              <small>activities covered</small>
            </article>

            <article>
              <span>Food</span>
              <strong>{hq.metrics.meals}</strong>
              <small>
                {hq.metrics.meals === 0
                  ? "no food services scheduled"
                  : hq.metrics.food_services_unready === 0
                    ? "services · food ready"
                    : `${hq.metrics.food_services_unready} ${
                        hq.metrics.food_services_unready === 1
                          ? "service needs food"
                          : "services need food"
                      }`}
              </small>
            </article>
          </div>

          <div className="event-hq-layout">
            <section className="app-card event-hq-overview">
              <div className="app-card-head event-hq-card-head">
                <div>
                  <strong>
                    At a glance
                  </strong>

                  <span>
                    What needs attention
                    before or during this
                    event.
                  </span>
                </div>

                {hq.metrics.unread_notices >
                  0 && (
                  <b className="event-hq-notice-count">
                    {
                      hq.metrics
                        .unread_notices
                    }{" "}
                    unread notices
                  </b>
                )}
              </div>

              {attention.length ? (
                <div className="event-hq-attention-list">
                  {attention.map(
                    (item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="event-hq-attention-row"
                        onClick={() =>
                          onNavigate(
                            item.destination,
                            item.options,
                          )
                        }
                      >
                        <span
                          className="event-hq-attention-dot"
                          aria-hidden="true"
                        />
                        <strong>
                          {item.label}
                        </strong>
                        <span className="event-hq-attention-action">
                          Open
                        </span>
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <div className="event-hq-clear">
                  <strong>
                    No immediate gaps.
                  </strong>

                  <span>
                    Guest spots, cabins,
                    staffing, meals, and
                    active services are
                    covered.
                  </span>
                </div>
              )}
            </section>

            <section className="app-card event-hq-households">
              <div className="app-card-head event-hq-card-head">
                <div>
                  <strong>
                    Households
                  </strong>

                  <span>
                    Registration and cabin
                    snapshot.
                  </span>
                </div>

                <button
                  type="button"
                  className="app-button"
                  onClick={() =>
                    onNavigate(
                      "registrations",
                    )
                  }
                >
                  Manage
                </button>
              </div>

              <div className="event-hq-household-list">
                {hq.registrations.map(
                  (registration) => (
                    <div
                      className="event-hq-household-row"
                      key={
                        registration.id
                      }
                    >
                      <div>
                        <strong>
                          {
                            registration.household_name
                          }
                        </strong>

                        <span>
                          {
                            registration.attendee_count
                          }
                          /
                          {
                            registration.spots_paid_for
                          }{" "}
                          attending
                        </span>
                      </div>

                      <b
                        className={
                          registration.cabin_name
                            ? ""
                            : "missing"
                        }
                      >
                        {registration.cabin_name ??
                          "Needs cabin"}
                      </b>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>

          <section className="app-card event-hq-schedule event-hq-schedule-preview">
            <div className="app-card-head event-hq-card-head">
              <div>
                <strong>Schedule preview</strong>
                <span>
                  The first few things happening in this event. Open Scheduling for the full calendar.
                </span>
              </div>

              <button
                type="button"
                className="app-button"
                onClick={() => onNavigate("scheduling")}
              >
                Full schedule
              </button>
            </div>

            {schedulePreview.length ? (
              <div className="event-hq-preview-list">
                {schedulePreview.map((item) => (
                  <article
                    className="event-hq-schedule-row"
                    key={`${item.kind}-${item.id}`}
                  >
                    <div className="event-hq-preview-time">
                      <strong>{timeLabel(item.starts_at)}</strong>
                      <span>{dayLabel(item.starts_at)}</span>
                    </div>

                    <span className={`event-hq-kind ${item.kind}`}>
                      {item.kind === "activity" ? "Activity" : "Meal"}
                    </span>

                    <div className="event-hq-schedule-main">
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind === "activity"
                          ? item.meta
                          : `${item.food_item_count ?? 0} ${
                              item.food_item_count === 1
                                ? "food"
                                : "foods"
                            }`}
                      </span>
                    </div>

                    <div className="event-hq-schedule-detail">
                      {item.kind === "activity" ? (
                        <>
                          <strong>{item.signup_count ?? 0} signups</strong>
                          <span>
                            {item.staff_names.length
                              ? item.staff_names.join(", ")
                              : "No staff"}
                          </span>
                        </>
                      ) : (
                        <strong>
                          {(item.food_item_count ?? 0) > 0
                            ? "Food ready"
                            : "Needs food"}
                        </strong>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="app-empty">Nothing scheduled yet.</div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
