import {
  useEffect,
  useState,
} from "react";

import type {
  StaffParticipant,
  StaffScheduledActivity,
} from "@appoponi/shared/schemas/staffDay";

import type {
  BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import type {
  FoodOrder,
} from "@appoponi/shared/schemas/foodOrders";

import type {
  StaffMember,
} from "@appoponi/shared/schemas/staffMembers";

import type {
  NotificationPreferences,
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import {
  checkInParticipant,
  loadStaffDay,
} from "../api/staffDay";

import {
  completeAssignedBabysitting,
  fulfillAssignedFoodOrder,
  loadBabysittingRequests,
  loadFoodOrders,
  loadNotificationPreferences,
  loadNotifications,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/services";

import {
  loadStaffMembers,
} from "../api/admin";

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

import AppSectionStack from "../components/AppSectionStack";

function staffActivityDateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function staffTimeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function staffActivityTimeRange(startsAt: string, endsAt: string) {
  return `${staffActivityDateLabel(startsAt)} · ${staffTimeLabel(startsAt)}–${staffTimeLabel(endsAt)}`;
}

function foodOrderTitle(order: FoodOrder) {
  return order.offering_type === "SNACK"
    ? "Snack pickup"
    : order.fulfillment === "delivery"
      ? "After-hours delivery"
      : "After-hours pickup";
}

function foodOrderItems(order: FoodOrder) {
  return order.items
    .map((item) => `${item.quantity}× ${item.item_name}`)
    .join(" · ");
}

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
    useState<StaffScheduledActivity[]>([]);

  const [
    participants,
    setParticipants,
  ] = useState<StaffParticipant[]>([]);

  const [
    babysitting,
    setBabysitting,
  ] = useState<BabysittingRequest[]>([]);

  const [
    foodOrders,
    setFoodOrders,
  ] = useState<FoodOrder[]>([]);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [
    notificationPreferences,
    setNotificationPreferences,
  ] = useState<NotificationPreferences | null>(null);

  const [
    staffProfile,
    setStaffProfile,
  ] = useState<StaffMember | null>(
    null,
  );

  const [error, setError] =
    useState<string | null>(null);

  const [
    pendingActions,
    setPendingActions,
  ] = useState<StaffOfflineAction[]>([]);

  const [syncing, setSyncing] =
    useState(false);

  type StaffDayData =
    Awaited<ReturnType<typeof loadStaffDay>>;

  function cacheKey() {
    return `staff-day:${account?.username ?? "unknown"}`;
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
  ) {
    if (!account?.username) {
      return;
    }

    const queued =
      enqueueStaffOfflineAction(
        account.username,
        signupId,
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

  function profileCacheKey() {
    return `staff-profile:${account?.username ?? "unknown"}`;
  }

  async function refreshProfile() {
    try {
      const profiles =
        await loadStaffMembers();

      const profile =
        profiles.find(
          (item) =>
            item.account_id ===
            account?.id,
        ) ??
        profiles[0] ??
        null;

      setStaffProfile(profile);

      saveOfflineCache(
        profileCacheKey(),
        profile,
      );
    } catch (err) {
      const cached =
        readOfflineCache<StaffMember | null>(
          profileCacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setStaffProfile(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  function babysittingCacheKey() {
    return `staff-babysitting:${account?.username ?? "unknown"}`;
  }

  async function refreshBabysitting() {
    try {
      const next =
        await loadBabysittingRequests();

      setBabysitting(next);

      saveOfflineCache(
        babysittingCacheKey(),
        next,
      );
    } catch (err) {
      const cached =
        readOfflineCache<BabysittingRequest[]>(
          babysittingCacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setBabysitting(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  function foodOrdersCacheKey() {
    return `staff-food-orders:${account?.username ?? "unknown"}`;
  }

  async function refreshFoodOrders() {
    try {
      const next =
        await loadFoodOrders();

      setFoodOrders(next);

      saveOfflineCache(
        foodOrdersCacheKey(),
        next,
      );
    } catch (err) {
      const cached =
        readOfflineCache<FoodOrder[]>(
          foodOrdersCacheKey(),
        );

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setFoodOrders(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  function notificationsCacheKey() {
    return `staff-notifications:${account?.username ?? "unknown"}`;
  }

  async function refreshNotifications() {
    try {
      const [nextNotifications, nextPreferences] =
        await Promise.all([
          loadNotifications(),
          loadNotificationPreferences(),
        ]);

      setNotifications(nextNotifications);
      setNotificationPreferences(nextPreferences);

      saveOfflineCache(
        notificationsCacheKey(),
        {
          notifications: nextNotifications,
          preferences: nextPreferences,
        },
      );
    } catch (err) {
      const cached = readOfflineCache<{
        notifications: NotificationRecord[];
        preferences: NotificationPreferences;
      }>(notificationsCacheKey());

      if (
        isOfflineFetchFailure(err) &&
        cached
      ) {
        setNotifications(cached.value.notifications);
        setNotificationPreferences(cached.value.preferences);
        return;
      }

      throw err;
    }
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
        isOfflineFetchFailure(err) &&
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
    void Promise.all([
      refresh(),
      refreshBabysitting(),
      refreshFoodOrders(),
      refreshProfile(),
      refreshNotifications(),
    ]).catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load staff work",
      ),
    );
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }

    const refreshAll = () => {
      void Promise.all([
        refresh(),
        refreshBabysitting(),
        refreshFoodOrders(),
        refreshProfile(),
        refreshNotifications(),
      ]).catch(() => {});
    };

    window.addEventListener(
      "focus",
      refreshAll,
    );

    const timer =
      window.setInterval(
        refreshAll,
        30_000,
      );

    return () => {
      window.removeEventListener(
        "focus",
        refreshAll,
      );
      window.clearInterval(
        timer,
      );
    };
  }, [
    online,
    account?.username,
  ]);

  async function markParticipantPresent(
    signupId: string,
  ) {
    setError(null);

    if (!online) {
      queueParticipantAction(
        signupId,
      );
      return;
    }

    try {
      await checkInParticipant(
        signupId,
      );

      await refresh();
    } catch (err) {
      if (
        isOfflineFetchFailure(err)
      ) {
        queueParticipantAction(
          signupId,
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

  async function markFoodOrderFulfilled(
    orderId: string,
  ) {
    setError(null);

    if (!online) {
      setError(
        "Connect to mark a food order fulfilled.",
      );
      return;
    }

    try {
      await fulfillAssignedFoodOrder(
        orderId,
      );
      await refreshFoodOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not fulfill food order",
      );
    }
  }

  async function markBabysittingComplete(
    requestId: string,
  ) {
    setError(null);

    if (!online) {
      setError(
        "Connect to complete babysitting.",
      );
      return;
    }

    try {
      await completeAssignedBabysitting(
        requestId,
      );
      await refreshBabysitting();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete babysitting",
      );
    }
  }

  async function readStaffNotice(
    notice: NotificationRecord,
  ) {
    if (!online || notice.read_at) {
      return;
    }

    setError(null);

    try {
      const updated =
        await markNotificationRead(notice.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark notice read",
      );
    }
  }

  async function changeStaffNotificationPreference(
    key:
      | "activity_reminders"
      | "special_notifications"
      | "general_notifications",
    value: boolean,
  ) {
    if (!online) {
      return;
    }

    setError(null);

    try {
      const updated =
        await updateNotificationPreferences({
          [key]: value,
        });

      setNotificationPreferences(updated);
      await refreshNotifications();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save notification preference",
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

        await checkInParticipant(
          next.signup_id,
        );

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
          : "Could not sync attendance",
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

  const unreadNotifications =
    notifications.filter(
      (notice) => !notice.read_at,
    );

  const now = Date.now();

  const activeActivities =
    activities.filter((activity) => {
      const start = new Date(activity.starts_at).getTime();
      const end = new Date(activity.ends_at).getTime();
      return start <= now && now < end;
    });

  const activeBabysitting =
    babysitting.filter((request) => {
      if (request.status !== "confirmed") {
        return false;
      }

      const start = new Date(request.starts_at).getTime();
      const end = new Date(request.ends_at).getTime();
      return start <= now && now < end;
    });

  const upcomingTimedWork = [
    ...activities
      .filter(
        (activity) =>
          new Date(activity.starts_at).getTime() > now,
      )
      .map((activity) => ({
        key: `activity-${activity.id}`,
        kind: "Activity" as const,
        title: activity.activity_name,
        detail: `${activity.area_name} · ${activity.event_name}`,
        starts_at: activity.starts_at,
        ends_at: activity.ends_at,
      })),
    ...babysitting
      .filter(
        (request) =>
          request.status === "confirmed" &&
          new Date(request.starts_at).getTime() > now,
      )
      .map((request) => ({
        key: `babysitting-${request.id}`,
        kind: "Babysitting" as const,
        title: request.member_names.join(", "),
        detail: request.username,
        starts_at: request.starts_at,
        ends_at: request.ends_at,
      })),
  ].sort(
    (left, right) =>
      new Date(left.starts_at).getTime() -
      new Date(right.starts_at).getTime(),
  );

  const openFoodOrders =
    foodOrders.filter(
      (order) =>
        order.status === "open",
    );

  const babysittingToComplete =
    babysitting.filter(
      (request) =>
        request.status === "confirmed" &&
        new Date(request.ends_at).getTime() <= now,
    );

  const attendanceToFinish =
    activities.flatMap((activity) => {
      if (
        new Date(activity.ends_at).getTime() > now
      ) {
        return [];
      }

      const people =
        participants.filter(
          (person) =>
            person.event_activity_id ===
            activity.id,
        );

      const missing =
        people.filter(
          (person) =>
            !person.checked_in_at,
        ).length;

      return missing > 0
        ? [{ activity, missing }]
        : [];
    });

  const hasBabysitting =
    babysitting.some(
      (request) =>
        request.status !== "cancelled",
    );

  return (
    <div className="member-app has-section-rail">
      <header className="member-header">
        <button
          type="button"
          className="app-home-brand member-home-brand"
          aria-label="Appoponi home"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <div className="brand-mark">
            A
          </div>

          <div>
            <strong>
              Appoponi
            </strong>

            <span>
              Staff ·{" "}
              {staffProfile?.full_name ??
                account?.username}
            </span>
          </div>
        </button>

        <button
          type="button"
          className="app-button"
          onClick={() =>
            void logout()
          }
        >
          Sign out
        </button>
      </header>

      <AppSectionStack
        label="Staff sections"
        items={[
          {
            id: "today",
            label: "Today",
            targetId:
              "staff-today",
          },
          {
            id: "notices",
            label: unreadNotifications.length
              ? `Notices · ${unreadNotifications.length}`
              : "Notices",
            targetId:
              "staff-notices",
          },
          {
            id: "schedule",
            label: "Schedule",
            targetId:
              "staff-schedule",
          },
          ...(hasBabysitting
            ? [
                {
                  id: "babysitting",
                  label: "Babysitting",
                  targetId:
                    "staff-babysitting",
                },
              ]
            : []),
        ]}
      />

      <main className="member-main">
        {(!online ||
          usingCachedData ||
          pendingActions.length > 0 ||
          syncing) && (
          <div className="app-alert app-alert-warning app-alert-sticky">
            {syncing
              ? "Syncing attendance…"
              : !online || usingCachedData
                ? "Offline · showing the last saved work. Attendance changes will sync automatically."
                : "Attendance changes are waiting to sync."}

            {pendingActions.length > 0 && (
              <span className="staff-sync-count">
                {" "}
                {pendingActions.length}{" "}
                pending
              </span>
            )}
          </div>
        )}

        <div
          id="staff-today"
          className="member-title member-scroll-target"
        >
          <h1>Today</h1>

          <p>
            What is happening now, what is next, and what needs your action.
          </p>
        </div>

        {error && (
          <div className="app-alert app-alert-danger app-alert-sticky">
            {error}
          </div>
        )}

        <div className="staff-today-grid">
          <section className="app-card staff-today-card">
            <div className="app-card-head">
              <div>
                <strong>Now</strong>
                <span>Active assignments.</span>
              </div>
              <span className="app-status-pill">
                {activeActivities.length + activeBabysitting.length}
              </span>
            </div>

            {activeActivities.map((activity) => {
              const people = participants.filter(
                (person) =>
                  person.event_activity_id === activity.id,
              );
              const missing = people.filter(
                (person) => !person.checked_in_at,
              ).length;

              return (
                <div className="app-record-row" key={`now-activity-${activity.id}`}>
                  <div className="app-record-copy">
                    <strong>{activity.activity_name}</strong>
                    <span>{staffActivityTimeRange(activity.starts_at, activity.ends_at)}</span>
                    <small>{activity.area_name}{missing > 0 ? ` · ${missing} to mark present` : " · Attendance complete"}</small>
                  </div>
                  <div className="app-record-actions">
                    <button
                      type="button"
                      className="app-button"
                      onClick={() =>
                        document.getElementById(`staff-activity-${activity.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      Attendance
                    </button>
                  </div>
                </div>
              );
            })}

            {activeBabysitting.map((request) => (
              <div className="app-record-row" key={`now-babysitting-${request.id}`}>
                <div className="app-record-copy">
                  <strong>Babysitting · {request.member_names.join(", ")}</strong>
                  <span>{staffActivityTimeRange(request.starts_at, request.ends_at)}</span>
                  <small>{request.username}</small>
                </div>
                <span className="app-status-pill">{request.status}</span>
              </div>
            ))}

            {activeActivities.length === 0 && activeBabysitting.length === 0 && (
              <div className="app-empty app-empty-compact">Nothing assigned right now.</div>
            )}
          </section>

          <section className="app-card staff-today-card">
            <div className="app-card-head">
              <div>
                <strong>Next</strong>
                <span>Upcoming timed work.</span>
              </div>
              <span className="app-status-pill">
                {upcomingTimedWork.length}
              </span>
            </div>

            {upcomingTimedWork.length ? (
              upcomingTimedWork.map((item) => (
                <div className="app-record-row" key={item.key}>
                  <div className="app-record-copy">
                    <strong>{item.title}</strong>
                    <span>{staffActivityTimeRange(item.starts_at, item.ends_at)}</span>
                    <small>{item.kind} · {item.detail}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="app-empty app-empty-compact">No upcoming timed work.</div>
            )}
          </section>

          <section className="app-card staff-today-card staff-needs-action-card">
            <div className="app-card-head">
              <div>
                <strong>Needs action</strong>
                <span>Work waiting on you.</span>
              </div>
              <span className="app-status-pill">
                {openFoodOrders.length + babysittingToComplete.length + attendanceToFinish.length}
              </span>
            </div>

            {openFoodOrders.map((order) => (
              <div className="app-record-row" key={`food-order-${order.id}`}>
                <div className="app-record-copy">
                  <strong>{foodOrderTitle(order)}</strong>
                  <span>{foodOrderItems(order)}</span>
                  <small>
                    {order.username}
                    {order.delivery_location ? ` · ${order.delivery_location}` : ""}
                  </small>
                </div>
                <div className="app-record-actions">
                  <button
                    type="button"
                    className="app-button app-button-primary"
                    disabled={!online}
                    onClick={() => void markFoodOrderFulfilled(order.id)}
                  >
                    Mark fulfilled
                  </button>
                </div>
              </div>
            ))}

            {babysittingToComplete.map((request) => (
              <div className="app-record-row" key={`complete-babysitting-${request.id}`}>
                <div className="app-record-copy">
                  <strong>Complete babysitting</strong>
                  <span>{request.member_names.join(", ")}</span>
                  <small>{staffActivityTimeRange(request.starts_at, request.ends_at)} · {request.username}</small>
                </div>
                <div className="app-record-actions">
                  <button
                    type="button"
                    className="app-button app-button-primary"
                    disabled={!online}
                    onClick={() => void markBabysittingComplete(request.id)}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}

            {attendanceToFinish.map(({ activity, missing }) => (
              <div className="app-record-row" key={`attendance-${activity.id}`}>
                <div className="app-record-copy">
                  <strong>{activity.activity_name}</strong>
                  <span>{missing} {missing === 1 ? "person" : "people"} still not marked present</span>
                  <small>{staffActivityTimeRange(activity.starts_at, activity.ends_at)}</small>
                </div>
                <div className="app-record-actions">
                  <button
                    type="button"
                    className="app-button"
                    onClick={() =>
                      document.getElementById(`staff-activity-${activity.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}

            {openFoodOrders.length === 0 && babysittingToComplete.length === 0 && attendanceToFinish.length === 0 && (
              <div className="app-empty app-empty-compact">Nothing needs action.</div>
            )}
          </section>
        </div>

        <section
          id="staff-notices"
          className="app-card member-card member-scroll-target"
        >
          <div className="app-card-head">
            <div>
              <strong>Notices</strong>
              <span>
                {unreadNotifications.length
                  ? `${unreadNotifications.length} unread`
                  : "You're caught up."}
              </span>
            </div>
          </div>

          {notificationPreferences && (
            <div className="preference-list">
              {[
                [
                  "activity_reminders",
                  "Activity reminders · 30 min before",
                ],
                [
                  "special_notifications",
                  "Special notices",
                ],
                [
                  "general_notifications",
                  "General notices",
                ],
              ].map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    disabled={!online}
                    checked={
                      notificationPreferences[
                        key as
                          | "activity_reminders"
                          | "special_notifications"
                          | "general_notifications"
                      ]
                    }
                    onChange={(event) =>
                      void changeStaffNotificationPreference(
                        key as
                          | "activity_reminders"
                          | "special_notifications"
                          | "general_notifications",
                        event.target.checked,
                      )
                    }
                  />
                </label>
              ))}
            </div>
          )}

          <div className="service-record-list">
            {notifications.length ? (
              notifications.map((notice) => (
                <div
                  className="app-record-row"
                  key={notice.id}
                >
                  <div className="app-record-copy">
                    <strong>{notice.title}</strong>
                    <span>{notice.body}</span>
                    <small>
                      {new Date(
                        notice.scheduled_for ?? notice.created_at,
                      ).toLocaleString()}
                    </small>
                  </div>
                  <div className="app-record-actions">
                    {notice.read_at ? (
                      <span className="app-status-pill">Read</span>
                    ) : (
                      <button
                        type="button"
                        className="app-button"
                        disabled={!online}
                        onClick={() => void readStaffNotice(notice)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="app-empty app-empty-compact">
                No notices.
              </div>
            )}
          </div>
        </section>

        <div
          id="staff-schedule"
          className="member-title member-scroll-target staff-section-title"
        >
          <h2>Schedule</h2>
          <p>All assigned activities and participant attendance.</p>
        </div>

        {activities.length ? (
          activities.map((activity) => {
            const people = participants.filter(
              (person) =>
                person.event_activity_id === activity.id,
            );

            const presentCount = people.filter(
              (person) => person.checked_in_at,
            ).length;

            const attendanceLabel =
              people.length === 0
                ? "No signups"
                : presentCount === people.length
                  ? `${presentCount}/${people.length} present`
                  : `${people.length - presentCount} to mark present`;

            return (
              <section
                id={`staff-activity-${activity.id}`}
                className="app-card member-card staff-activity-card member-scroll-target"
                key={activity.id}
              >
                <div className="app-card-head staff-activity-head">
                  <div>
                    <strong>{activity.activity_name}</strong>
                    <span>{staffActivityTimeRange(activity.starts_at, activity.ends_at)} · {activity.area_name}</span>
                    <span>{activity.event_name}</span>
                  </div>
                  <span className="app-status-pill">{attendanceLabel}</span>
                </div>

                <div className="staff-participant-list">
                  {people.length ? (
                    people.map((person) => (
                      <div className="app-record-row staff-attendance-row" key={person.signup_id}>
                        <div className="app-record-copy">
                          <strong>{person.member_name}</strong>
                          {pendingActions.some((item) => item.signup_id === person.signup_id) && (
                            <small>Pending sync</small>
                          )}
                        </div>
                        <div className="app-record-actions">
                          {!person.checked_in_at ? (
                            <button
                              className="app-button"
                              type="button"
                              onClick={() => void markParticipantPresent(person.signup_id)}
                            >
                              Mark present
                            </button>
                          ) : (
                            <span className="app-status-pill staff-present-state">Present</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="app-empty app-empty-compact">No participants signed up.</div>
                  )}
                </div>
              </section>
            );
          })
        ) : (
          <section className="app-card member-card app-empty">No activities assigned.</section>
        )}

        {hasBabysitting && (
          <section
            id="staff-babysitting"
            className="app-card member-card staff-babysitting-card member-scroll-target"
          >
            <div className="app-card-head">
              <div>
                <strong>Babysitting</strong>
                <span>All assigned requests.</span>
              </div>
            </div>

            <div className="staff-babysitting-list">
              {babysitting
                .filter((request) => request.status !== "cancelled")
                .map((request) => (
                  <div className="app-record-row" key={request.id}>
                    <div className="app-record-copy">
                      <strong>{request.member_names.join(", ")}</strong>
                      <span>{staffActivityTimeRange(request.starts_at, request.ends_at)}</span>
                      <small>{request.username}{request.notes ? ` · ${request.notes}` : ""}</small>
                    </div>
                    <div className="app-record-actions">
                      <span className="app-status-pill">{request.status}</span>
                      {request.status === "confirmed" && new Date(request.ends_at).getTime() <= now && (
                        <button
                          type="button"
                          className="app-button"
                          disabled={!online}
                          onClick={() => void markBabysittingComplete(request.id)}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
