import {
  Box,
  Button,
  Grid,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

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
    <Box
      as="section"
      id="member-today"
      scrollMarginTop={{
        base: "128px",
        md: "84px",
      }}
      mb="18px"
      overflow="hidden"
      borderWidth="1px"
      borderColor="#dddcd5"
      borderRadius="12px"
      bg="#ffffff"
    >
      <Box
        minH="66px"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="14px"
        px="4"
        py="13px"
        borderBottomWidth="1px"
        borderColor="#dddcd5"
      >
        <Stack
          minW="0"
          gap="2px"
        >
          <Text
            color="#6d7169"
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            TODAY
          </Text>

          <Text
            fontSize="17px"
            fontWeight="700"
            letterSpacing="-0.02em"
          >
            {registration.event_name}
          </Text>

          <Text
            color="#6d7169"
            fontSize="11px"
          >
            {dateRangeLabel(
              registration.event_starts_at,
              registration.event_ends_at,
            )}
          </Text>
        </Stack>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenItinerary}
        >
          Full itinerary
        </Button>
      </Box>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, minmax(0, 1fr))",
        }}
        borderBottomWidth="1px"
        borderColor="#dddcd5"
      >
        <Stack
          minW="0"
          minH={{
            base: "76px",
            md: "92px",
          }}
          justifyContent="center"
          alignItems="flex-start"
          gap="1"
          px="4"
          py="14px"
          borderRightWidth={{
            base: "0",
            md: "1px",
          }}
          borderBottomWidth={{
            base: "1px",
            md: "0",
          }}
          borderColor="#dddcd5"
        >
          <Text
            color="#6d7169"
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            NOW
          </Text>

          <Text
            maxW="full"
            overflow="hidden"
            fontWeight="700"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {nowTitle}
          </Text>

          <Text
            color="#6d7169"
            fontSize="10px"
          >
            {nowMeta}
          </Text>
        </Stack>

        <Button
          type="button"
          variant="ghost"
          borderRadius="0"
          minW="0"
          minH={{
            base: "76px",
            md: "92px",
          }}
          h="auto"
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          gap="1"
          px="4"
          py="14px"
          color="#171915"
          textAlign="left"
          disabled={!nextEntry}
          onClick={onOpenItinerary}
        >
          <Text
            color="#6d7169"
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            NEXT
          </Text>

          <Text
            maxW="full"
            overflow="hidden"
            fontWeight="700"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {nextEntry
              ? entryTitle(nextEntry)
              : "Nothing else scheduled"}
          </Text>

          <Text
            color="#6d7169"
            fontSize="10px"
          >
            {nextEntry
              ? `${dateLabel(nextEntry.starts_at)} · ${timeLabel(nextEntry.starts_at)}`
              : "Your schedule is clear."}
          </Text>
        </Button>
      </Grid>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(3, minmax(0, 1fr))",
        }}
      >
        <Button
          type="button"
          variant="ghost"
          borderRadius="0"
          minW="0"
          minH={{
            base: "64px",
            md: "76px",
          }}
          h="auto"
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          gap="3px"
          px="14px"
          py="11px"
          borderRightWidth={{
            base: "0",
            md: "1px",
          }}
          borderBottomWidth={{
            base: "1px",
            md: "0",
          }}
          borderColor="#dddcd5"
          color="#171915"
          textAlign="left"
          disabled={!nextMeal}
          onClick={() =>
            nextMeal &&
            onOpenMeal(nextMeal)
          }
        >
          <Text
            color="#6d7169"
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            NEXT MEAL
          </Text>

          <Text
            maxW="full"
            overflow="hidden"
            fontWeight="700"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {nextMeal
              ? nextMeal.title ??
                nextMeal.meal_type_name
              : "No upcoming meal"}
          </Text>

          <Text
            color="#6d7169"
            fontSize="10px"
          >
            {nextMeal
              ? `${dateLabel(nextMeal.starts_at)} · ${timeLabel(nextMeal.starts_at)}`
              : "No more meals scheduled."}
          </Text>
        </Button>

        <Button
          type="button"
          variant="ghost"
          borderRadius="0"
          minW="0"
          minH={{
            base: "64px",
            md: "76px",
          }}
          h="auto"
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          gap="3px"
          px="14px"
          py="11px"
          borderRightWidth={{
            base: "0",
            md: "1px",
          }}
          borderBottomWidth={{
            base: "1px",
            md: "0",
          }}
          borderColor="#dddcd5"
          color="#171915"
          textAlign="left"
          onClick={onOpenStay}
        >
          <Text
            color="#6d7169"
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            CABIN
          </Text>

          <Text
            maxW="full"
            overflow="hidden"
            fontWeight="700"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {registration.cabin_name ??
              "Not assigned"}
          </Text>

          <Text
            color="#6d7169"
            fontSize="10px"
          >
            {attendees.length}/
            {registration.spots_paid_for} attending
          </Text>
        </Button>

        <Button
          type="button"
          variant="ghost"
          borderRadius="0"
          minW="0"
          minH={{
            base: "64px",
            md: "76px",
          }}
          h="auto"
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          justifyContent="center"
          gap="3px"
          px="14px"
          py="11px"
          color="#171915"
          textAlign="left"
          disabled={
            unreadNotifications.length === 0
          }
          onClick={onOpenNotices}
        >
          <Text
            color="#6d7169"
            fontSize="9px"
            fontWeight="800"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            NOTICES
          </Text>

          <Text
            maxW="full"
            overflow="hidden"
            fontWeight="700"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {unreadNotifications.length
              ? `${unreadNotifications.length} unread`
              : "All caught up"}
          </Text>

          <Text
            color="#6d7169"
            fontSize="10px"
          >
            {unreadNotifications[0]?.title ??
              "No unread notices."}
          </Text>
        </Button>
      </Grid>

      <Box
        minH="48px"
        display="flex"
        flexDirection={{
          base: "column",
          md: "row",
        }}
        alignItems={{
          base: "flex-start",
          md: "center",
        }}
        justifyContent="space-between"
        gap="3"
        px={{
          base: "4",
          md: "4",
        }}
        py="2"
        borderTopWidth="1px"
        borderColor="#dddcd5"
      >
        <Text
          fontSize="11px"
          fontWeight="700"
          color={
            actionCount
              ? "#6a5821"
              : "#171915"
          }
        >
          {actionCount
            ? "Needs your attention"
            : "You’re set"}
        </Text>

        <HStack
          w={{
            base: "full",
            md: "auto",
          }}
          justifyContent={{
            base: "flex-start",
            md: "flex-end",
          }}
          gap="7px"
          flexWrap="wrap"
        >
          {attendingGap > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenStay}
            >
              Choose {attendingGap} more{" "}
              {attendingGap === 1
                ? "guest"
                : "guests"}
            </Button>
          )}

          {unreadNotifications.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenNotices}
            >
              Read notices
            </Button>
          )}
        </HStack>
      </Box>
    </Box>
  );
}
