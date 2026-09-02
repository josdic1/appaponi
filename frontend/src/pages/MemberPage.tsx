import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import type {
  ActivitySignup,
  EventRegistration,
  MemberAttendee,
} from "@appoponi/shared/schemas/registration";

import type {
  EventActivity,
} from "@appoponi/shared/schemas/scheduling";

import {
  addAttendee,
  addSignup,
  loadMemberHome,
  removeAttendee,
  removeSignup,
} from "../api/member";

import { useAuth } from "../hooks/useAuth";

type EventActivityWithCount =
  EventActivity & {
    signup_count: number;
  };

export default function MemberPage() {
  const { account, logout } = useAuth();

  const [
    registrations,
    setRegistrations,
  ] = useState<EventRegistration[]>([]);

  const [household, setHousehold] =
    useState<HouseholdMember[]>([]);

  const [attendees, setAttendees] =
    useState<MemberAttendee[]>([]);

  const [activities, setActivities] =
    useState<EventActivityWithCount[]>([]);

  const [signups, setSignups] =
    useState<ActivitySignup[]>([]);

  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const data =
      await loadMemberHome();

    setRegistrations(
      data.registrations,
    );
    setHousehold(data.household);
    setAttendees(data.attendees);
    setActivities(data.activities);
    setSignups(data.signups);

    setSelectedEventId(
      (current) =>
        current ||
        data.registrations[0]
          ?.event_id ||
        "",
    );
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Appoponi",
      ),
    );
  }, []);

  const registration =
    useMemo(
      () =>
        registrations.find(
          (item) =>
            item.event_id ===
            selectedEventId,
        ) ?? null,
      [
        registrations,
        selectedEventId,
      ],
    );

  const eventAttendees =
    attendees.filter(
      (item) =>
        item.event_id ===
        selectedEventId,
    );

  const attendeeByMember =
    new Map(
      eventAttendees.map(
        (item) => [
          item.member_id,
          item,
        ],
      ),
    );

  const eventActivities =
    activities.filter(
      (item) =>
        item.event_id ===
        selectedEventId,
    );

  async function run(
    action: () => Promise<unknown>,
  ) {
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

  return (
    <div className="member-app">
      <header className="member-header">
        <div>
          <div className="brand-mark">
            A
          </div>

          <div>
            <strong>Appoponi</strong>
            <span>
              {account?.username}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void logout()
          }
        >
          Sign out
        </button>
      </header>

      <main className="member-main">
        <div className="member-title">
          <h1>Your stay</h1>

          {registrations.length >
          1 ? (
            <select
              value={selectedEventId}
              onChange={(event) =>
                setSelectedEventId(
                  event.target.value,
                )
              }
            >
              {registrations.map(
                (item) => (
                  <option
                    key={item.id}
                    value={
                      item.event_id
                    }
                  >
                    {
                      item.event_name
                    }
                  </option>
                ),
              )}
            </select>
          ) : (
            <p>
              {registration
                ?.event_name ??
                "No upcoming event"}
            </p>
          )}
        </div>

        {error && (
          <div className="member-error">
            {error}
          </div>
        )}

        {!registration ? (
          <section className="member-card member-empty">
            This household is not
            registered for an event yet.
          </section>
        ) : (
          <>
            <section className="member-card">
              <div className="member-card-head">
                <div>
                  <strong>
                    Who's attending?
                  </strong>

                  <span>
                    {
                      eventAttendees.length
                    }{" "}
                    of{" "}
                    {
                      registration.spots_paid_for
                    }{" "}
                    spots
                  </span>
                </div>
              </div>

              <div className="member-profile-list">
                {household.map(
                  (person) => {
                    const attendee =
                      attendeeByMember.get(
                        person.id,
                      );

                    return (
                      <button
                        type="button"
                        key={
                          person.id
                        }
                        className={
                          attendee
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          void run(
                            () =>
                              attendee
                                ? removeAttendee(
                                    attendee.id,
                                  )
                                : addAttendee(
                                    Number(
                                      person.id,
                                    ),
                                    Number(
                                      registration.event_id,
                                    ),
                                  ),
                          )
                        }
                      >
                        <span>
                          <strong>
                            {
                              person.full_name
                            }
                          </strong>

                          <small>
                            {
                              person.member_role
                            }
                          </small>
                        </span>

                        <b>
                          {attendee
                            ? "Attending"
                            : "Not attending"}
                        </b>
                      </button>
                    );
                  },
                )}
              </div>
            </section>

            <section className="member-card member-activities-card">
              <div className="member-card-head">
                <div>
                  <strong>
                    Activities
                  </strong>

                  <span>
                    Choose activities
                    for each attending
                    person.
                  </span>
                </div>
              </div>

              <div className="member-activity-list">
                {eventActivities.length ? (
                  eventActivities.map(
                    (activity) => {
                      const activitySignups =
                        signups.filter(
                          (signup) =>
                            signup.event_activity_id ===
                            activity.id,
                        );

                      return (
                        <article
                          className="member-activity"
                          key={
                            activity.id
                          }
                        >
                          <div className="member-activity-head">
                            <div>
                              <strong>
                                {
                                  activity.activity_name
                                }
                              </strong>

                              <span>
                                {
                                  activity.area_name
                                }{" "}
                                ·{" "}
                                {new Date(
                                  activity.starts_at,
                                ).toLocaleString(
                                  [],
                                  {
                                    weekday:
                                      "short",
                                    hour:
                                      "numeric",
                                    minute:
                                      "2-digit",
                                  },
                                )}
                              </span>
                            </div>

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

                          <div className="member-signup-people">
                            {eventAttendees.map(
                              (
                                attendee,
                              ) => {
                                const signup =
                                  activitySignups.find(
                                    (
                                      item,
                                    ) =>
                                      item.member_attendee_id ===
                                      attendee.id,
                                  );

                                return (
                                  <button
                                    type="button"
                                    key={
                                      attendee.id
                                    }
                                    className={
                                      signup
                                        ? "selected"
                                        : ""
                                    }
                                    onClick={() =>
                                      void run(
                                        () =>
                                          signup
                                            ? removeSignup(
                                                signup.id,
                                              )
                                            : addSignup(
                                                Number(
                                                  activity.id,
                                                ),
                                                Number(
                                                  attendee.id,
                                                ),
                                              ),
                                      )
                                    }
                                  >
                                    {
                                      attendee.full_name
                                    }
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </article>
                      );
                    },
                  )
                ) : (
                  <div className="member-empty">
                    No activities have
                    been scheduled yet.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
