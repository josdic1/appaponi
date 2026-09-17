import type { NotificationRecord } from "@appoponi/shared/schemas/notifications";
import type {
  ActivitySignup,
  EventRegistration,
  MemberAttendee,
} from "@appoponi/shared/schemas/registration";
import type { EventActivity } from "@appoponi/shared/schemas/scheduling";
import type { EventMeal } from "@appoponi/shared/schemas/meals";

type ActivityWithCount = EventActivity & {
  signup_count: number;
};

type Props = {
  registration: EventRegistration;
  activities: ActivityWithCount[];
  meals: EventMeal[];
  attendees: MemberAttendee[];
  signups: ActivitySignup[];
  unreadNotifications: NotificationRecord[];
  onOpenItinerary: () => void;
  onOpenMeal: (meal: EventMeal) => void;
  onOpenStay: () => void;
  onOpenNotices: () => void;
};

type ScheduleEntry =
  | {
      kind: "activity";
      starts_at: string;
      ends_at: string;
      title: string;
      meta: string;
      activity: ActivityWithCount;
    }
  | {
      kind: "meal";
      starts_at: string;
      ends_at: string;
      title: string;
      meta: string;
      meal: EventMeal;
    };

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dateRangeLabel(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })}–${end.toLocaleDateString([], {
      day: "numeric",
      year: "numeric",
    })}`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })}–${end.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return `${start.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}–${end.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function entryTitle(entry: ScheduleEntry) {
  return entry.title;
}

export default function MemberToday({
  registration,
  activities,
  meals,
  attendees,
  signups,
  unreadNotifications,
  onOpenItinerary,
  onOpenMeal,
  onOpenStay,
  onOpenNotices,
}: Props) {
  const now = Date.now();
  const eventStart = new Date(registration.event_starts_at).getTime();
  const eventEnd = new Date(registration.event_ends_at).getTime();

  const attendeeIds = new Set(attendees.map((item) => item.id));
  const signedActivityIds = new Set(
    signups
      .filter((signup) => attendeeIds.has(signup.member_attendee_id))
      .map((signup) => signup.event_activity_id),
  );

  const entries: ScheduleEntry[] = [
    ...activities.map((activity) => ({
      kind: "activity" as const,
      starts_at: activity.starts_at,
      ends_at: activity.ends_at,
      title: activity.activity_name,
      meta: activity.area_name,
      activity,
    })),
    ...meals.map((meal) => ({
      kind: "meal" as const,
      starts_at: meal.starts_at,
      ends_at: meal.ends_at,
      title: meal.title ?? meal.meal_type_name,
      meta: meal.meal_type_name,
      meal,
    })),
  ].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const activeEntries = entries.filter((entry) => {
    const start = new Date(entry.starts_at).getTime();
    const end = new Date(entry.ends_at).getTime();
    return start <= now && end > now;
  });

  const currentEntry =
    activeEntries.find(
      (entry) =>
        entry.kind === "activity" && signedActivityIds.has(entry.activity.id),
    ) ?? activeEntries[0] ?? null;

  const nextEntry =
    entries.find((entry) => new Date(entry.starts_at).getTime() > now) ?? null;

  const nextMeal =
    meals
      .slice()
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      )
      .find((meal) => new Date(meal.starts_at).getTime() > now) ?? null;

  const eventIsUpcoming = now < eventStart;
  const eventHasEnded = now > eventEnd;
  const attendingGap = Math.max(
    0,
    registration.spots_paid_for - attendees.length,
  );

  let nowTitle = "Free time";
  let nowMeta = "Nothing is scheduled right now.";

  if (eventIsUpcoming) {
    nowTitle = `Starts ${dateLabel(registration.event_starts_at)}`;
    nowMeta = timeLabel(registration.event_starts_at);
  } else if (eventHasEnded) {
    nowTitle = "Event complete";
    nowMeta = `Ended ${dateLabel(registration.event_ends_at)}`;
  } else if (currentEntry) {
    nowTitle = entryTitle(currentEntry);
    nowMeta = `${timeLabel(currentEntry.starts_at)}–${timeLabel(currentEntry.ends_at)} · ${currentEntry.meta}`;
  }

  const actionCount =
    (attendingGap > 0 ? 1 : 0) +
    (unreadNotifications.length > 0 ? 1 : 0);

  return (
    <section id="member-today" className="app-card member-today member-scroll-target">
      <div className="app-card-head member-today-head">
        <div>
          <span className="member-today-kicker">TODAY</span>
          <strong>{registration.event_name}</strong>
          <span>
            {dateRangeLabel(
              registration.event_starts_at,
              registration.event_ends_at,
            )}
          </span>
        </div>

        <button type="button" className="app-button" onClick={onOpenItinerary}>
          Full itinerary
        </button>
      </div>

      <div className="member-today-moments">
        <div className="member-today-moment">
          <span>NOW</span>
          <strong>{nowTitle}</strong>
          <small>{nowMeta}</small>
        </div>

        <button
          type="button"
          className="member-today-moment member-today-moment-action"
          onClick={onOpenItinerary}
          disabled={!nextEntry}
        >
          <span>NEXT</span>
          <strong>{nextEntry ? entryTitle(nextEntry) : "Nothing else scheduled"}</strong>
          <small>
            {nextEntry
              ? `${dateLabel(nextEntry.starts_at)} · ${timeLabel(nextEntry.starts_at)}`
              : "Your schedule is clear."}
          </small>
        </button>
      </div>

      <div className="member-today-facts">
        <button
          type="button"
          className="member-today-fact"
          onClick={() => nextMeal && onOpenMeal(nextMeal)}
          disabled={!nextMeal}
        >
          <span>NEXT MEAL</span>
          <strong>{nextMeal ? nextMeal.title ?? nextMeal.meal_type_name : "No upcoming meal"}</strong>
          <small>
            {nextMeal
              ? `${dateLabel(nextMeal.starts_at)} · ${timeLabel(nextMeal.starts_at)}`
              : "No more meals scheduled."}
          </small>
        </button>

        <button type="button" className="member-today-fact" onClick={onOpenStay}>
          <span>CABIN</span>
          <strong>{registration.cabin_name ?? "Not assigned"}</strong>
          <small>
            {attendees.length}/{registration.spots_paid_for} attending
          </small>
        </button>

        <button
          type="button"
          className="member-today-fact"
          onClick={onOpenNotices}
          disabled={unreadNotifications.length === 0}
        >
          <span>NOTICES</span>
          <strong>
            {unreadNotifications.length
              ? `${unreadNotifications.length} unread`
              : "All caught up"}
          </strong>
          <small>
            {unreadNotifications[0]?.title ?? "No unread notices."}
          </small>
        </button>
      </div>

      <div className={`member-today-actions ${actionCount ? "has-actions" : ""}`}>
        <strong>{actionCount ? "Needs your attention" : "You’re set"}</strong>

        <div>
          {attendingGap > 0 && (
            <button type="button" className="app-button" onClick={onOpenStay}>
              Choose {attendingGap} more {attendingGap === 1 ? "guest" : "guests"}
            </button>
          )}

          {unreadNotifications.length > 0 && (
            <button type="button" className="app-button" onClick={onOpenNotices}>
              Read notices
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
