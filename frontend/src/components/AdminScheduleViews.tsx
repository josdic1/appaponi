import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  useState,
} from "react";

import type {
  EventActivity,
  EventActivityStaff,
} from "@appoponi/shared/schemas/scheduling";

type Props = {
  activities: EventActivity[];
  assignments: EventActivityStaff[];
  onSelectActivity: (activityId: string) => void;
};

function dayKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function assignedNames(
  activityId: string,
  assignments: EventActivityStaff[],
) {
  return assignments
    .filter(
      (assignment) =>
        assignment.event_activity_id === activityId,
    )
    .map((assignment) => assignment.staff_name);
}

export function AdminScheduleDailyView({
  activities,
  assignments,
  onSelectActivity,
}: Props) {
  const sorted = [...activities].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() -
      new Date(b.starts_at).getTime(),
  );

  const days = Array.from(
    new Set(sorted.map((item) => dayKey(item.starts_at))),
  );

  const [selectedDay, setSelectedDay] = useState(
    days[0] ?? "",
  );

  const activeDay = days.includes(selectedDay)
    ? selectedDay
    : days[0] ?? "";

  const dayActivities = sorted.filter(
    (item) => dayKey(item.starts_at) === activeDay,
  );

  if (!sorted.length) {
    return (
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        bg="white"
        p="8"
        textAlign="center"
      >
        <Text color="gray.500">
          No scheduled activities yet.
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap="4">
      <HStack
        gap="2"
        overflowX="auto"
        pb="1"
      >
        {days.map((day) => {
          const sample = sorted.find(
            (item) => dayKey(item.starts_at) === day,
          );

          if (!sample) {
            return null;
          }

          const active = day === activeDay;

          return (
            <Button
              key={day}
              type="button"
              size="sm"
              flex="0 0 auto"
              variant={active ? "solid" : "outline"}
              colorPalette={active ? "green" : undefined}
              onClick={() => setSelectedDay(day)}
            >
              {dayLabel(sample.starts_at)}
            </Button>
          );
        })}
      </HStack>

      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        bg="white"
        overflow="hidden"
      >
        {dayActivities.map((item) => {
          const staffNames = assignedNames(
            item.id,
            assignments,
          );

          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              h="auto"
              w="full"
              borderRadius="0"
              justifyContent="stretch"
              px="5"
              py="4"
              borderBottomWidth="1px"
              borderColor="gray.100"
              onClick={() =>
                onSelectActivity(item.id)
              }
            >
              <Grid
                w="full"
                templateColumns={{
                  base: "82px minmax(0, 1fr)",
                  md: "110px minmax(0, 1fr) 200px",
                }}
                gap="4"
                alignItems="center"
                textAlign="left"
              >
                <Stack gap="0">
                  <Text fontWeight="700">
                    {timeLabel(item.starts_at)}
                  </Text>

                  <Text
                    fontSize="xs"
                    color="gray.500"
                  >
                    {timeLabel(item.ends_at)}
                  </Text>
                </Stack>

                <Stack gap="0" minW="0">
                  <Text fontWeight="700">
                    {item.activity_name}
                  </Text>

                  <Text
                    fontSize="sm"
                    color="gray.500"
                  >
                    {item.area_name}
                  </Text>
                </Stack>

                <Stack
                  display={{
                    base: "none",
                    md: "flex",
                  }}
                  gap="0"
                  minW="0"
                >
                  <Text
                    fontSize="sm"
                    color={
                      staffNames.length
                        ? "gray.600"
                        : "orange.600"
                    }
                  >
                    {staffNames.length
                      ? staffNames.join(", ")
                      : "Unstaffed"}
                  </Text>

                  {item.capacity && (
                    <Text
                      fontSize="xs"
                      color="gray.500"
                    >
                      Capacity {item.capacity}
                    </Text>
                  )}
                </Stack>
              </Grid>
            </Button>
          );
        })}
      </Box>
    </Stack>
  );
}

export function AdminScheduleCalendarView({
  activities,
  assignments,
  onSelectActivity,
}: Props) {
  const sorted = [...activities].sort(
    (a, b) =>
      new Date(a.starts_at).getTime() -
      new Date(b.starts_at).getTime(),
  );

  if (!sorted.length) {
    return (
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        bg="white"
        p="8"
        textAlign="center"
      >
        <Text color="gray.500">
          No scheduled activities yet.
        </Text>
      </Box>
    );
  }

  const days = Array.from(
    new Set(sorted.map((item) => dayKey(item.starts_at))),
  );

  const starts = sorted.map((item) =>
    new Date(item.starts_at),
  );

  const ends = sorted.map((item) =>
    new Date(item.ends_at),
  );

  const firstHour = Math.max(
    0,
    Math.min(...starts.map((date) => date.getHours())) - 1,
  );

  const lastHour = Math.min(
    24,
    Math.max(
      ...ends.map((date) =>
        date.getHours() +
        (date.getMinutes() > 0 ? 1 : 0),
      ),
    ) + 1,
  );

  const hourHeight = 72;
  const hourCount = Math.max(lastHour - firstHour, 1);
  const canvasHeight = hourCount * hourHeight;

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflowX="auto"
    >
      <Box
        minW={`${80 + days.length * 190}px`}
      >
        <Grid
          gridTemplateColumns={`80px repeat(${days.length}, minmax(190px, 1fr))`}
          borderBottomWidth="1px"
          borderColor="gray.200"
          bg="gray.50"
        >
          <Box />

          {days.map((day) => {
            const sample = sorted.find(
              (item) =>
                dayKey(item.starts_at) === day,
            );

            return (
              <Box
                key={day}
                px="3"
                py="3"
                borderLeftWidth="1px"
                borderColor="gray.200"
              >
                <Text
                  fontSize="sm"
                  fontWeight="700"
                >
                  {sample
                    ? dayLabel(sample.starts_at)
                    : day}
                </Text>
              </Box>
            );
          })}
        </Grid>

        <Grid
          gridTemplateColumns={`80px repeat(${days.length}, minmax(190px, 1fr))`}
        >
          <Box
            position="relative"
            h={`${canvasHeight}px`}
          >
            {Array.from(
              { length: hourCount + 1 },
              (_, index) => {
                const hour = firstHour + index;
                const date = new Date();
                date.setHours(hour, 0, 0, 0);

                return (
                  <Text
                    key={hour}
                    position="absolute"
                    top={`${index * hourHeight - 8}px`}
                    right="3"
                    fontSize="xs"
                    color="gray.500"
                  >
                    {new Intl.DateTimeFormat(
                      undefined,
                      {
                        hour: "numeric",
                      },
                    ).format(date)}
                  </Text>
                );
              },
            )}
          </Box>

          {days.map((day) => (
            <Box
              key={day}
              position="relative"
              h={`${canvasHeight}px`}
              borderLeftWidth="1px"
              borderColor="gray.200"
            >
              {Array.from(
                { length: hourCount + 1 },
                (_, index) => (
                  <Box
                    key={index}
                    position="absolute"
                    top={`${index * hourHeight}px`}
                    left="0"
                    right="0"
                    borderTopWidth="1px"
                    borderColor="gray.100"
                  />
                ),
              )}

              {sorted
                .filter(
                  (item) =>
                    dayKey(item.starts_at) === day,
                )
                .map((item) => {
                  const start = new Date(
                    item.starts_at,
                  );

                  const end = new Date(
                    item.ends_at,
                  );

                  const startMinutes =
                    (start.getHours() - firstHour) * 60 +
                    start.getMinutes();

                  const durationMinutes = Math.max(
                    (end.getTime() -
                      start.getTime()) /
                      60000,
                    30,
                  );

                  const top =
                    (startMinutes / 60) * hourHeight;

                  const height = Math.max(
                    (durationMinutes / 60) *
                      hourHeight,
                    36,
                  );

                  const staffNames = assignedNames(
                    item.id,
                    assignments,
                  );

                  return (
                    <Button
                      key={item.id}
                      type="button"
                      position="absolute"
                      top={`${top}px`}
                      left="6px"
                      right="6px"
                      h={`${height}px`}
                      minH="36px"
                      p="2"
                      variant="outline"
                      borderColor="green.200"
                      bg="green.50"
                      justifyContent="flex-start"
                      alignItems="flex-start"
                      overflow="hidden"
                      onClick={() =>
                        onSelectActivity(item.id)
                      }
                    >
                      <Stack
                        gap="0"
                        minW="0"
                        textAlign="left"
                      >
                        <HStack gap="2">
                          <Text
                            fontSize="xs"
                            fontWeight="700"
                          >
                            {timeLabel(
                              item.starts_at,
                            )}
                          </Text>

                          {!staffNames.length && (
                            <Badge
                              size="sm"
                              colorPalette="orange"
                            >
                              Unstaffed
                            </Badge>
                          )}
                        </HStack>

                        <Text
                          fontSize="sm"
                          fontWeight="700"
                          lineClamp={1}
                        >
                          {item.activity_name}
                        </Text>

                        <Text
                          fontSize="xs"
                          color="gray.600"
                          lineClamp={1}
                        >
                          {item.area_name}
                        </Text>
                      </Stack>
                    </Button>
                  );
                })}
            </Box>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
