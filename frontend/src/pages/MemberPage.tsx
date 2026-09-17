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
  CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

import type {
  EventActivity,
} from "@appoponi/shared/schemas/scheduling";

import type {
  NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import type {
  EventMeal,
} from "@appoponi/shared/schemas/meals";

import {
  addAttendee,
  addSignup,
  loadMemberHome,
  removeAttendee,
  removeSignup,
  updateEventHouseholdLead,
} from "../api/member";

import {
  loadNotifications,
  markNotificationRead,
} from "../api/services";

import { useAuth } from "../hooks/useAuth";
import {
  useOnlineStatus,
} from "../hooks/useOnlineStatus";
import {
  isOfflineFetchFailure,
  readOfflineCache,
  saveOfflineCache,
} from "../lib/offlineCache";
import AppSectionStack from "../components/AppSectionStack";
import FamilyItinerary from "./FamilyItinerary";
import MemberCampMap from "./MemberCampMap";
import MemberDirectory from "./MemberDirectory";
import MemberHouseholdPanel from "./MemberHouseholdPanel";
import MemberToday from "./MemberToday";
import MemberServicesPanel from "./MemberServicesPanel";

type EventActivityWithCount =
  EventActivity & {
    signup_count: number;
  };

function memberRoleLabel(
  role:
    | "primary"
    | "adult"
    | "child",
) {
  if (role === "primary") {
    return "Default lead";
  }

  return role.charAt(0).toUpperCase() +
    role.slice(1);
}

export default function MemberPage() {
  const { account, logout } = useAuth();
  const online = useOnlineStatus();

  const [
    usingCachedData,
    setUsingCachedData,
  ] = useState(false);

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

  const [meals, setMeals] =
    useState<EventMeal[]>([]);

  const [
    notifications,
    setNotifications,
  ] = useState<NotificationRecord[]>([]);

  const [
    activeEventId,
    setActiveEventId,
  ] = useState("");

  const [
    mapFocusTarget,
    setMapFocusTarget,
  ] = useState<CampMapPlaceId | null>(null);

  const [
    mealOpenRequest,
    setMealOpenRequest,
  ] = useState<{
    requestId: number;
    startsAt: string;
  } | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  type MemberHomeData =
    Awaited<
      ReturnType<
        typeof loadMemberHome
      >
    >;

  function applyHome(
    data: MemberHomeData,
  ) {
    setRegistrations(
      data.registrations,
    );
    setHousehold(data.household);
    setAttendees(data.attendees);
    setActivities(data.activities);
    setSignups(data.signups);
    setMeals(data.meals);

    setActiveEventId((current) => {
      if (
        current &&
        data.registrations.some(
          (item) => item.event_id === current,
        )
      ) {
        return current;
      }

      const now = Date.now();
      const sorted = data.registrations
        .slice()
        .sort(
          (a, b) =>
            new Date(a.event_starts_at).getTime() -
            new Date(b.event_starts_at).getTime(),
        );

      const preferred =
        sorted.find((item) => {
          const start = new Date(item.event_starts_at).getTime();
          const end = new Date(item.event_ends_at).getTime();
          return start <= now && end >= now;
        }) ??
        sorted.find(
          (item) => new Date(item.event_starts_at).getTime() > now,
        ) ??
        sorted.at(-1);

      return preferred?.event_id ?? "";
    });
  }

  function cacheKey() {
    return `member-home:${
      account?.username ??
      "unknown"
    }`;
  }

  function noticeCacheKey() {
    return `member-notices:${
      account?.username ??
      "unknown"
    }`;
  }

  async function refreshNotices() {
    try {
      const next =
        await loadNotifications();

      setNotifications(next);

      saveOfflineCache(
        noticeCacheKey(),
        next,
      );
    } catch (err) {
      const cached =
        readOfflineCache<
          NotificationRecord[]
        >(
          noticeCacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        setNotifications(
          cached.value,
        );
        return;
      }

      throw err;
    }
  }

  async function refresh() {
    try {
      const data =
        await loadMemberHome();

      applyHome(data);

      saveOfflineCache(
        cacheKey(),
        data,
      );

      setUsingCachedData(false);
      setError(null);
    } catch (err) {
      const cached =
        readOfflineCache<MemberHomeData>(
          cacheKey(),
        );

      if (
        isOfflineFetchFailure(
          err,
        ) &&
        cached
      ) {
        applyHome(cached.value);
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
      refreshNotices(),
    ]).catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Appoponi",
      ),
    );
  }, []);

  useEffect(() => {
    if (!online) {
      return;
    }

    const updateNotices = () => {
      void refreshNotices().catch(
        () => {},
      );
    };

    window.addEventListener(
      "focus",
      updateNotices,
    );

    const timer =
      window.setInterval(
        updateNotices,
        30_000,
      );

    return () => {
      window.removeEventListener(
        "focus",
        updateNotices,
      );
      window.clearInterval(
        timer,
      );
    };
  }, [
    online,
    account?.username,
  ]);

  const registration =
    useMemo(
      () =>
        registrations.find(
          (item) =>
            item.event_id ===
            activeEventId,
        ) ?? null,
      [
        registrations,
        activeEventId,
      ],
    );

  const eventAttendees =
    attendees.filter(
      (item) =>
        item.event_id ===
        activeEventId,
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

  const householdLeadCandidates =
    eventAttendees.filter(
      (item) =>
        item.member_role !==
        "child",
    );

  const eventActivities =
    activities.filter(
      (item) =>
        item.event_id ===
        activeEventId,
    );

  const eventMeals =
    meals.filter(
      (item) =>
        item.event_id ===
        activeEventId,
    );

  const eventActivityIds =
    new Set(
      eventActivities.map(
        (item) => item.id,
      ),
    );

  const eventSignups =
    signups.filter((item) =>
      eventActivityIds.has(
        item.event_activity_id,
      ),
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

  function toggleItinerarySignup(
    activity: EventActivityWithCount,
    attendee: MemberAttendee,
    signup: ActivitySignup | null,
  ) {
    void run(() =>
      signup
        ? removeSignup(signup.id)
        : addSignup(
            Number(activity.id),
            Number(attendee.id),
          ),
    );
  }

  function showOnMap(targetId: CampMapPlaceId) {
    setMapFocusTarget(targetId);

    window.requestAnimationFrame(() => {
      document
        .getElementById("member-map")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }

  function openMealDetails(meal: EventMeal) {
    setMealOpenRequest((current) => ({
      requestId: (current?.requestId ?? 0) + 1,
      startsAt: meal.starts_at,
    }));

    window.requestAnimationFrame(() => {
      document
        .getElementById("member-services")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function scrollToMemberSection(targetId: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const unreadNotifications =
    notifications.filter(
      (notice) =>
        !notice.read_at &&
        (notice.event_id === null ||
          notice.event_id === activeEventId),
    );

  async function readNotice(
    notice: NotificationRecord,
  ) {
    if (
      !online ||
      usingCachedData
    ) {
      return;
    }

    try {
      const updated =
        await markNotificationRead(
          notice.id,
        );

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updated.id
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

  const householdDisplayName =
    registrations[0]?.household_name ??
    household[0]?.household_name ??
    account?.username ??
    "Member";

  return (
    <div className="member-app has-section-rail">
      <header className="member-header">
        <button
          type="button"
          className="app-home-brand member-home-brand"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          aria-label="Appoponi home"
        >
          <div className="brand-mark">
            A
          </div>

          <div>
            <strong>Appoponi</strong>
            <span>
              {householdDisplayName}
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
        label="Member sections"
        items={[
          {
            id: "today",
            label: "Today",
            targetId:
              "member-today",
          },
          {
            id: "itinerary",
            label: "Itinerary",
            targetId:
              "member-itinerary",
          },
          {
            id: "stay",
            label: "Stay + map",
            targetId:
              "member-stay",
          },
          {
            id: "services",
            label: "Food + services",
            targetId:
              "member-services",
          },
          {
            id: "directory",
            label: "Directory",
            targetId:
              "member-directory",
          },
          {
            id: "household",
            label: "Household",
            targetId:
              "member-household",
          },
        ]}
      />

      <main className="member-main">
        {(!online ||
          usingCachedData) && (
          <div className="app-alert app-alert-warning">
            Offline · showing the
            last saved information.
            Changes are unavailable.
          </div>
        )}



        <div className="member-title">
          <h1>Your stay</h1>

          {registrations.length >
          1 ? (
            <select
              value={activeEventId}
              onChange={(event) => {
                setActiveEventId(
                  event.target.value,
                );
                setMapFocusTarget(null);
              }}
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
          <div className="app-alert app-alert-danger app-alert-sticky" role="alert">
            {error}
          </div>
        )}

        {!registration ? (
          <section className="app-card member-card app-empty">
            This household is not
            registered for an event yet.
          </section>
        ) : (
          <>
            <MemberToday
              registration={registration}
              activities={eventActivities}
              meals={eventMeals}
              attendees={eventAttendees}
              signups={eventSignups}
              unreadNotifications={unreadNotifications}
              onOpenItinerary={() =>
                scrollToMemberSection("member-itinerary")
              }
              onOpenMeal={openMealDetails}
              onOpenStay={() =>
                scrollToMemberSection("member-stay")
              }
              onOpenNotices={() =>
                scrollToMemberSection(
                  unreadNotifications.length
                    ? "member-priority-notices"
                    : "member-services",
                )
              }
            />

        {unreadNotifications.length >
          0 && (
          <section
            id="member-priority-notices"
            className="member-priority-notices member-scroll-target"
            aria-label="Unread notices"
          >
            <div className="member-priority-notices-head">
              <strong>
                {unreadNotifications.length ===
                1
                  ? "New notice"
                  : `${unreadNotifications.length} new notices`}
              </strong>
            </div>

            {unreadNotifications.map(
              (notice) => (
                <article
                  className="member-priority-notice"
                  key={notice.id}
                >
                  <div>
                    <strong>
                      {notice.title}
                    </strong>

                    <span>
                      {notice.body}
                    </span>

                    <small>
                      {new Date(
                        notice.created_at,
                      ).toLocaleString()}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="app-button"
                    disabled={
                      !online ||
                      usingCachedData
                    }
                    onClick={() =>
                      void readNotice(
                        notice,
                      )
                    }
                  >
                    Mark read
                  </button>
                </article>
              ),
            )}
          </section>
        )}

            <div
              id="member-itinerary"
              className="member-scroll-target"
            >
              <FamilyItinerary
                activities={eventActivities}
                meals={eventMeals}
                attendees={eventAttendees}
                signups={eventSignups}
                changesUnavailable={
                  !online ||
                  usingCachedData
                }
                onToggleSignup={
                  toggleItinerarySignup
                }
                onShowOnMap={
                  showOnMap
                }
                onOpenMeal={
                  openMealDetails
                }
              />
            </div>

            <div
              id="member-stay"
              className="member-scroll-target member-stay-grid"
            >
              <section className="app-card member-card member-stay-card">
                <div className="app-card-head">
                  <div>
                    <strong>Your stay</strong>
                    <span>
                      {registration.cabin_name
                        ? `${registration.cabin_name} · ${eventAttendees.length}/${registration.spots_paid_for} attending`
                        : `${eventAttendees.length}/${registration.spots_paid_for} attending · Cabin not assigned`}
                    </span>
                  </div>
                </div>

                <div className="member-profile-list member-attendance-list">
                  {household.map((person) => {
                    const attendee = attendeeByMember.get(person.id);

                    return (
                      <button
                        type="button"
                        key={person.id}
                        className={`member-attendee ${attendee ? "active" : ""}`}
                        disabled={!online || usingCachedData}
                        onClick={() =>
                          void run(() =>
                            attendee
                              ? removeAttendee(attendee.id)
                              : addAttendee(
                                  Number(person.id),
                                  Number(registration.event_id),
                                ),
                          )
                        }
                      >
                        <span>
                          <strong>{person.full_name}</strong>
                          <small>{memberRoleLabel(person.member_role)}</small>
                        </span>

                        <b className="member-attendee-state">
                          {attendee ? "Going" : "Not going"}
                        </b>
                      </button>
                    );
                  })}
                </div>

                <div className="app-record-row member-household-lead-row">
                  <div className="app-record-copy">
                    <strong>Household lead</strong>
                    <span>
                      Camp&apos;s lead contact for this event. This does not change who can use the shared household login.
                    </span>
                  </div>

                  <div className="app-record-actions">
                    {householdLeadCandidates.length ? (
                      <select
                        aria-label="Household lead"
                        value={registration.household_lead_member_id ?? ""}
                        disabled={!online || usingCachedData}
                        onChange={(event) =>
                          void run(() =>
                            updateEventHouseholdLead(
                              Number(registration.event_id),
                              Number(event.target.value),
                            ),
                          )
                        }
                      >
                        <option value="" disabled>
                          Choose adult
                        </option>

                        {householdLeadCandidates.map((person) => (
                          <option key={person.member_id} value={person.member_id}>
                            {person.full_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="app-badge">Choose an attending adult</span>
                    )}
                  </div>
                </div>
              </section>

              <div id="member-map" className="member-map-in-stay">
                <MemberCampMap
                  registration={registration}
                  focusTarget={mapFocusTarget}
                />
              </div>
            </div>
          </>
        )}

        <div
          id="member-services"
          className="member-scroll-target"
        >
          <MemberServicesPanel
            activeEventId={activeEventId}
            registration={registration}
            household={household}
            mealOpenRequest={mealOpenRequest}
          />
        </div>

        {registration && (
          <div
            id="member-directory"
            className="member-scroll-target member-directory-section"
          >
            <MemberDirectory
              eventId={activeEventId}
              cacheIdentity={
                account?.username ??
                "member"
              }
              changesUnavailable={
                !online ||
                usingCachedData
              }
            />
          </div>
        )}

        <div
          id="member-household"
          className="member-scroll-target member-household-settings"
        >
          <MemberHouseholdPanel
            household={household}
            disabled={!online || usingCachedData}
            onChanged={refresh}
          />
        </div>
      </main>
    </div>
  );
}
