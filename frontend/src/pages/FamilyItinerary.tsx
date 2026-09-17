import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ActivitySignup,
  MemberAttendee,
} from "@appoponi/shared/schemas/registration";

import type {
  EventActivity,
} from "@appoponi/shared/schemas/scheduling";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

import type {
  CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

type ActivityWithCount =
  EventActivity & {
    signup_count: number;
  };

type Props = {
  activities: ActivityWithCount[];
  meals: EventMeal[];
  attendees: MemberAttendee[];
  signups: ActivitySignup[];
  changesUnavailable: boolean;
  onToggleSignup: (
    activity: ActivityWithCount,
    attendee: MemberAttendee,
    signup: ActivitySignup | null,
  ) => void;
  onShowOnMap: (targetId: CampMapPlaceId) => void;
  onOpenMeal: (meal: EventMeal) => void;
};

type TimelineEntry =
  | {
      kind: "activity";
      starts_at: string;
      ends_at: string;
      activity: ActivityWithCount;
    }
  | {
      kind: "meal";
      starts_at: string;
      ends_at: string;
      meal: EventMeal;
    };

function localDayKey(
  value: string,
) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(date.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function dayLabel(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FamilyItinerary({
  activities,
  meals,
  attendees,
  signups,
  changesUnavailable,
  onToggleSignup,
  onShowOnMap,
  onOpenMeal,
}: Props) {
  const [editingActivityId, setEditingActivityId] =
    useState<string | null>(null);

  const entries = useMemo<TimelineEntry[]>(
    () =>
      [
        ...activities.map(
          (activity) => ({
            kind: "activity" as const,
            starts_at: activity.starts_at,
            ends_at: activity.ends_at,
            activity,
          }),
        ),
        ...meals.map((meal) => ({
          kind: "meal" as const,
          starts_at: meal.starts_at,
          ends_at: meal.ends_at,
          meal,
        })),
      ].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() -
          new Date(b.starts_at).getTime(),
      ),
    [activities, meals],
  );

  const dayGroups = useMemo(() => {
    const grouped = new Map<string, TimelineEntry[]>();

    for (const entry of entries) {
      const key = localDayKey(entry.starts_at);
      grouped.set(key, [
        ...(grouped.get(key) ?? []),
        entry,
      ]);
    }

    return [...grouped.entries()];
  }, [entries]);

  const [selectedDayKey, setSelectedDayKey] =
    useState<string | null>(null);

  useEffect(() => {
    const firstDayKey = dayGroups[0]?.[0] ?? null;

    if (
      !selectedDayKey ||
      !dayGroups.some(([key]) => key === selectedDayKey)
    ) {
      setSelectedDayKey(firstDayKey);
      setEditingActivityId(null);
    }
  }, [dayGroups, selectedDayKey]);

  const selectedDay =
    dayGroups.find(([key]) => key === selectedDayKey) ??
    dayGroups[0] ??
    null;

  if (!entries.length) {
    return (
      <section className="app-card member-card app-empty">
        No itinerary has been scheduled
        yet.
      </section>
    );
  }

  return (
    <section className="family-itinerary">
      <div className="family-itinerary-heading">
        <div>
          <span className="family-itinerary-kicker">
            FAMILY ITINERARY
          </span>
          <h2>Daily schedule</h2>
          <p>
            Meals, campwide events, and
            your family&apos;s activity
            signups in one place.
          </p>
        </div>
      </div>

      <div className="family-itinerary-filter-wrap">
        <nav
          className="family-itinerary-day-filter"
          aria-label="Choose itinerary day"
        >
          {dayGroups.map(([key, dayEntries]) => {
            const date = new Date(dayEntries[0].starts_at);
            const weekday = date.toLocaleDateString([], {
              weekday: "short",
            });
            const dayNumber = date.toLocaleDateString([], {
              day: "numeric",
            });

            return (
              <button
                type="button"
                key={key}
                className={key === selectedDayKey ? "active" : ""}
                aria-pressed={key === selectedDayKey}
                onClick={() => {
                  setSelectedDayKey(key);
                  setEditingActivityId(null);
                }}
              >
                <span>{weekday}</span>
                <strong>{dayNumber}</strong>
              </button>
            );
          })}
        </nav>
      </div>

      {selectedDay && (
        <div className="family-itinerary-days">
          <section className="family-itinerary-day" key={selectedDay[0]}>
            <header>
              <strong>{dayLabel(selectedDay[1][0].starts_at)}</strong>
              <span>{selectedDay[1].length} scheduled</span>
            </header>
              <div className="family-itinerary-list">
                {selectedDay[1].map(
                  (entry) => {
                    if (
                      entry.kind ===
                      "meal"
                    ) {
                      const meal =
                        entry.meal;

                      const mealTitle =
                        meal.title ??
                        meal.meal_type_name;

                      return (
                        <article
                          className="family-itinerary-row meal"
                          key={`meal:${meal.id}`}
                        >
                          <div className="family-itinerary-time">
                            <strong>
                              {timeLabel(
                                meal.starts_at,
                              )}
                            </strong>
                            <span>
                              to{" "}
                              {timeLabel(
                                meal.ends_at,
                              )}
                            </span>
                          </div>

                          <div className="family-itinerary-copy">
                            <div className="family-itinerary-title-line">
                              <span className="family-itinerary-type">
                                Meal
                              </span>
                              <strong>{mealTitle}</strong>

                              <button
                                type="button"
                                className="family-itinerary-action-link"
                                onClick={() => onOpenMeal(meal)}
                              >
                                Menu
                              </button>

                              <button
                                type="button"
                                className="family-itinerary-action-link"
                                onClick={() => onShowOnMap("dining-hall")}
                              >
                                Map
                              </button>
                            </div>

                            <span className="family-itinerary-meta">
                              Dining / Kitchen
                            </span>
                          </div>
                        </article>
                      );
                    }

                    const activity =
                      entry.activity;

                    const activitySignups =
                      signups.filter(
                        (signup) =>
                          signup.event_activity_id ===
                          activity.id,
                      );

                    const mapTarget =
                      activity.map_place_id;

                    return (
                      <article
                        className="family-itinerary-row activity"
                        key={`activity:${activity.id}`}
                      >
                        <div className="family-itinerary-time">
                          <strong>
                            {timeLabel(
                              activity.starts_at,
                            )}
                          </strong>
                          <span>
                            to{" "}
                            {timeLabel(
                              activity.ends_at,
                            )}
                          </span>
                        </div>

                        <div className="family-itinerary-copy">
                          <div className="family-itinerary-title-line">
                            <span className="family-itinerary-type">
                              Activity
                            </span>
                            <strong>
                              {
                                activity.activity_name
                              }
                            </strong>

                            {mapTarget && (
                              <button
                                type="button"
                                className="family-itinerary-action-link"
                                onClick={() => onShowOnMap(mapTarget)}
                              >
                                Map
                              </button>
                            )}

                            {activity.capacity && (
                              <small>
                                {
                                  activity.signup_count
                                }
                                /
                                {
                                  activity.capacity
                                }
                              </small>
                            )}
                          </div>

                          <span className="family-itinerary-meta">
                            {
                              activity.area_name
                            }
                          </span>

                          {attendees.length > 0 && (
                            <div className="family-itinerary-attendance">
                              <div className="family-itinerary-attendance-summary">
                                <span>
                                  {activitySignups.length
                                    ? activitySignups
                                        .map((signup) => signup.member_name)
                                        .join(", ")
                                    : "No one from your family signed up"}
                                </span>
                                <button
                                  type="button"
                                  className="family-itinerary-edit-family"
                                  onClick={() =>
                                    setEditingActivityId(
                                      editingActivityId === activity.id
                                        ? null
                                        : activity.id,
                                    )
                                  }
                                >
                                  {editingActivityId === activity.id
                                    ? "Done"
                                    : "Edit family"}
                                </button>
                              </div>

                              {editingActivityId === activity.id && (
                                <div className="family-itinerary-signups">
                                  {attendees.map((attendee) => {
                                    const signup =
                                      activitySignups.find(
                                        (item) =>
                                          item.member_attendee_id === attendee.id,
                                      ) ?? null;

                                    return (
                                      <button
                                        type="button"
                                        key={attendee.id}
                                        className={signup ? "selected" : ""}
                                        disabled={changesUnavailable}
                                        onClick={() =>
                                          onToggleSignup(
                                            activity,
                                            attendee,
                                            signup,
                                          )
                                        }
                                      >
                                        {attendee.full_name}
                                        <span>{signup ? "✓" : "+"}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
          </section>
        </div>
      )}

    </section>
  );
}
