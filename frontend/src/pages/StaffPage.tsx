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

import {
  applyStaffOfflineActions,
  enqueueStaffOfflineAction,
  readStaffOfflineQueue,
  saveStaffOfflineQueue,
  type StaffOfflineAction,
} from "../lib/staffOfflineQueue";

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

  const [
    pendingActions,
    setPendingActions,
  ] = useState<StaffOfflineAction[]>([]);

  const [syncing, setSyncing] =
    useState(false);

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

  function currentQueue() {
    if (!account?.username) {
      return [];
    }

    return readStaffOfflineQueue(
      account.username,
    );
  }

  function applyStaffDay(
    data: StaffDayData,
  ) {
    const queued =
      currentQueue();

    setPendingActions(queued);

    setActivities(
      data.activities,
    );

    setParticipants(
      applyStaffOfflineActions(
        data.participants,
        queued,
      ),
    );
  }

  function queueParticipantAction(
    signupId: string,
    action:
      | "check-in"
      | "check-out",
  ) {
    if (!account?.username) {
      return;
    }

    const queued =
      enqueueStaffOfflineAction(
        account.username,
        signupId,
        action,
      );

    setPendingActions(queued);

    setParticipants(
      (current) =>
        applyStaffOfflineActions(
          current,
          queued,
        ),
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

  async function changeParticipant(
    signupId: string,
    action:
      | "check-in"
      | "check-out",
  ) {
    setError(null);

    if (!online) {
      queueParticipantAction(
        signupId,
        action,
      );
      return;
    }

    try {
      if (action === "check-in") {
        await checkInParticipant(
          signupId,
        );
      } else {
        await checkOutParticipant(
          signupId,
        );
      }

      await refresh();
    } catch (err) {
      if (
        isOfflineFetchFailure(err)
      ) {
        queueParticipantAction(
          signupId,
          action,
        );

        setUsingCachedData(true);
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  async function syncPendingActions() {
    if (
      !online ||
      !account?.username
    ) {
      return;
    }

    let queued =
      readStaffOfflineQueue(
        account.username,
      );

    if (!queued.length) {
      setPendingActions([]);
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      while (
        queued.length &&
        navigator.onLine
      ) {
        const next =
          queued[0];

        try {
          if (
            next.action ===
            "check-in"
          ) {
            await checkInParticipant(
              next.signup_id,
            );
          } else {
            await checkOutParticipant(
              next.signup_id,
            );
          }
        } catch (err) {
          if (
            next.action ===
              "check-in" &&
            err instanceof Error &&
            err.message ===
              "Participant is already checked out"
          ) {
            // A completed participant must never be reopened.
          } else {
            throw err;
          }
        }

        queued =
          queued.slice(1);

        saveStaffOfflineQueue(
          account.username,
          queued,
        );

        setPendingActions(
          queued,
        );
      }

      if (!queued.length) {
        await refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sync check-in changes",
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (online) {
      void syncPendingActions();
    }
  }, [
    online,
    account?.username,
  ]);

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
          usingCachedData ||
          pendingActions.length >
            0 ||
          syncing) && (
          <div className="member-offline">
            {syncing
              ? "Syncing check-in changes…"
              : !online ||
                  usingCachedData
                ? "Offline · showing the last saved schedule. Check-in changes will sync automatically."
                : "Check-in changes are waiting to sync."}

            {pendingActions.length >
              0 && (
              <span className="staff-sync-count">
                {" "}
                {
                  pendingActions.length
                }{" "}
                pending
              </span>
            )}
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
                            <div className="staff-participant-copy">
                              <strong>
                                {
                                  person.member_name
                                }
                              </strong>

                              {pendingActions.some(
                                (item) =>
                                  item.signup_id ===
                                  person.signup_id,
                              ) && (
                                <small>
                                  Pending sync
                                </small>
                              )}
                            </div>

                            {!person.checked_in_at ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void changeParticipant(
                                    person.signup_id,
                                    "check-in",
                                  )
                                }
                              >
                                Check in
                              </button>
                            ) : !person.checked_out_at ? (
                              <button
                                type="button"
                                className="selected"
                                onClick={() =>
                                  void changeParticipant(
                                    person.signup_id,
                                    "check-out",
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
