import {
  useEffect,
  useState,
} from "react";

import type {
  StaffParticipant,
  StaffScheduledActivity,
} from "@appoponi/shared/schemas/staffDay";

import {
  checkInParticipant,
  checkOutParticipant,
  loadStaffDay,
} from "../api/staffDay";

import {
  useAuth,
} from "../hooks/useAuth";

import {
  useOnlineStatus,
} from "../hooks/useOnlineStatus";

import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";

export default function StaffPage() {
  const { account, logout } =
    useAuth();

  const online =
    useOnlineStatus();

  const [
    usingCachedData,
    setUsingCachedData,
  ] = useState(false);

  const [activities, setActivities] =
    useState<
      StaffScheduledActivity[]
    >([]);

  const [
    participants,
    setParticipants,
  ] = useState<StaffParticipant[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  type StaffDayData =
    Awaited<
      ReturnType<
        typeof loadStaffDay
      >
    >;

  function cacheKey() {
    return `staff-day:${
      account?.username ??
      "unknown"
    }`;
  }

  function applyStaffDay(
    data: StaffDayData,
  ) {
    setActivities(
      data.activities,
    );

    setParticipants(
      data.participants,
    );
  }

  async function refresh() {
    try {
      const data =
        await loadStaffDay();

      applyStaffDay(data);

      saveOfflineCache(
        cacheKey(),
        data,
      );

      setUsingCachedData(false);
      setError(null);
    } catch (err) {
      const cached =
        readOfflineCache<StaffDayData>(
          cacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        applyStaffDay(
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
          : "Could not load staff schedule",
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
            <strong>
              Appoponi
            </strong>

            <span>
              Staff ·{" "}
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
        {(!online ||
          usingCachedData) && (
          <div className="member-offline">
            Offline · showing the
            last saved schedule.
            Check-in changes are
            unavailable.
          </div>
        )}

        <div className="member-title">
          <h1>Your schedule</h1>

          <p>
            Today's assigned activities
            and participant check-in.
          </p>
        </div>

        {error && (
          <div className="member-error">
            {error}
          </div>
        )}

        {activities.length ? (
          activities.map(
            (activity) => {
              const people =
                participants.filter(
                  (person) =>
                    person.event_activity_id ===
                    activity.id,
                );

              return (
                <section
                  className="member-card staff-activity-card"
                  key={activity.id}
                >
                  <div className="member-card-head">
                    <div>
                      <strong>
                        {
                          activity.activity_name
                        }
                      </strong>

                      <span>
                        {
                          activity.event_name
                        }{" "}
                        ·{" "}
                        {
                          activity.area_name
                        }
                      </span>

                      <span>
                        {new Date(
                          activity.starts_at,
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="staff-participant-list">
                    {people.length ? (
                      people.map(
                        (person) => (
                          <div
                            className="staff-participant"
                            key={
                              person.signup_id
                            }
                          >
                            <strong>
                              {
                                person.member_name
                              }
                            </strong>

                            {!person.checked_in_at ? (
                              <button
                                type="button"
                                disabled={
                                  !online ||
                                  usingCachedData
                                }
                                onClick={() =>
                                  void run(
                                    () =>
                                      checkInParticipant(
                                        person.signup_id,
                                      ),
                                  )
                                }
                              >
                                Check in
                              </button>
                            ) : !person.checked_out_at ? (
                              <button
                                type="button"
                                className="selected"
                                disabled={
                                  !online ||
                                  usingCachedData
                                }
                                onClick={() =>
                                  void run(
                                    () =>
                                      checkOutParticipant(
                                        person.signup_id,
                                      ),
                                  )
                                }
                              >
                                Check out
                              </button>
                            ) : (
                              <span>
                                Complete
                              </span>
                            )}
                          </div>
                        ),
                      )
                    ) : (
                      <div className="member-empty">
                        No participants
                        signed up.
                      </div>
                    )}
                  </div>
                </section>
              );
            },
          )
        ) : (
          <section className="member-card member-empty">
            No activities assigned.
          </section>
        )}
      </main>
    </div>
  );
}
