import {
  Alert,
  Box,
  Grid,
  NativeSelect,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Cabin,
} from "@appoponi/shared/schemas/cabins";
import type {
  CampCabinSlotId,
} from "@appoponi/shared/schemas/campMap";
import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import {
  assignRegistrationCabin,
  loadCabins,
  loadRegistrations,
} from "../api/admin";

import CampMapBase, {
  CAMP_MAP_CABINS,
  CAMP_MAP_HEIGHT,
  CampCabinShape,
  CAMP_MAP_WIDTH,
} from "./CampMapBase";

type Props = {
  activeEventId?: string;
  onChanged?: () => void;
};

export default function AdminCabinsPanel({
  activeEventId = "",
  onChanged,
}: Props) {
  const [cabins, setCabins] =
    useState<Cabin[]>([]);
  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([]);
  const [error, setError] =
    useState<string | null>(null);

  async function refresh() {
    const [
      nextCabins,
      nextRegistrations,
    ] = await Promise.all([
      loadCabins(),
      loadRegistrations(),
    ]);

    setCabins(nextCabins);
    setRegistrations(nextRegistrations);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(
        err instanceof Error
          ? err.message
          : "Could not load cabins",
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
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Request failed",
      );
    }
  }

  const slotOwners = useMemo(() => {
    const result = new Map<
      CampCabinSlotId,
      Cabin
    >();

    for (const cabin of cabins) {
      if (cabin.map_slot_id) {
        result.set(
          cabin.map_slot_id,
          cabin,
        );
      }
    }

    return result;
  }, [cabins]);

  const activeRegistrations = useMemo(
    () =>
      activeEventId
        ? registrations.filter((registration) => registration.event_id === activeEventId)
        : registrations,
    [activeEventId, registrations],
  );

  const cabinNameById = useMemo(
    () => new Map(cabins.map((cabin) => [cabin.id, cabin.name])),
    [cabins],
  );

  function assignmentsFor(
    cabinId: string,
  ) {
    return registrations.filter(
      (registration) =>
        registration.cabin_id === cabinId &&
        (!activeEventId || registration.event_id === activeEventId),
    );
  }

  return (
    <Box
      as="section"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
    >
      <Box
        px="5"
        py="4"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Stack gap="0">
          <Text fontWeight="700">
            Cabin assignments
          </Text>

          <Text
            fontSize="sm"
            color="gray.500"
          >
            {cabins.length} fixed reusable cabins. Household assignments change by event; physical cabin map positions come from reusable setup.
          </Text>
        </Stack>
      </Box>

      {error && (
        <Box p="4">
          <Alert.Root status="error">
            <Alert.Indicator />

            <Alert.Content>
              <Alert.Description>
                {error}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </Box>
      )}

      <Box
        p={{
          base: "3",
          md: "4",
        }}
        bg="#f8f7f2"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <chakra.svg
          viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
          role="img"
          aria-label="Camp map"
          w="full"
          maxW="1000px"
          mx="auto"
          display="block"
          overflow="hidden"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="white"
        >
          <CampMapBase />

          {CAMP_MAP_CABINS.map(
            (slot) => {
              const owner =
                slotOwners.get(
                  slot.id,
                );

              if (!owner) {
                return null;
              }

              const assigned =
                assignmentsFor(
                  owner.id,
                ).length > 0;

              const centerX =
                slot.x +
                slot.width / 2;
              const centerY =
                slot.y +
                slot.height / 2;

              const numberMatch =
                owner.name.match(
                  /^Cabin\s+(\d+)$/i,
                );

              const label =
                numberMatch?.[1] ??
                owner.name
                  .slice(0, 2)
                  .toUpperCase();

              return (
                <chakra.g
                  key={slot.id}
                  pointerEvents="none"
                >
                  <CampCabinShape
                    slot={slot}
                    state={
                      assigned
                        ? "assigned"
                        : "placed"
                    }
                  />

                  <chakra.text
                    x={centerX}
                    y={centerY + 3}
                    textAnchor="middle"
                    fontSize="9px"
                    fontWeight="800"
                    fill="#174a32"
                    paintOrder="stroke"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    vectorEffect="non-scaling-stroke"
                  >
                    {label}
                  </chakra.text>
                </chakra.g>
              );
            },
          )}
        </chakra.svg>
      </Box>

      <Box
        px={{
          base: "3",
          md: "4",
        }}
        py="4"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Stack gap="1" mb="4">
          <Text fontWeight="700">
            Weekend cabin assignments
          </Text>

          <Text
            fontSize="sm"
            color="gray.500"
          >
            {activeRegistrations.length} households · {cabins.length} cabins · {cabins.filter((cabin) => Boolean(cabin.map_slot_id)).length} preset map locations
          </Text>
        </Stack>

        {cabins.length ? (
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            }}
            gap="3"
          >
            {cabins.map((cabin) => {
              const assignments =
                assignmentsFor(
                  cabin.id,
                );

              const assignment =
                assignments[0] ??
                null;

              return (
                <Box
                  key={cabin.id}
                  minW="0"
                  p="3"
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="lg"
                  bg="white"
                >
                  <Stack gap="2">
                    <Text
                      fontWeight="700"
                      lineClamp="1"
                    >
                      {cabin.name}
                    </Text>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        aria-label={`Household assigned to ${cabin.name}`}
                        value={
                          assignment?.id ??
                          ""
                        }
                        onChange={(
                          event,
                        ) => {
                          const registrationId =
                            event.target
                              .value;

                          if (
                            !registrationId
                          ) {
                            if (
                              assignment
                            ) {
                              void run(
                                () =>
                                  assignRegistrationCabin(
                                    assignment.id,
                                    null,
                                  ),
                              );
                            }

                            return;
                          }

                          void run(() =>
                            assignRegistrationCabin(
                              registrationId,
                              Number(
                                cabin.id,
                              ),
                            ),
                          );
                        }}
                      >
                        <option value="">
                          Available
                        </option>

                        {activeRegistrations.map(
                          (
                            registration,
                          ) => {
                            const currentCabin =
                              registration.cabin_id
                                ? cabinNameById.get(
                                    registration.cabin_id,
                                  )
                                : null;

                            const isCurrent =
                              registration.id ===
                              assignment?.id;

                            return (
                              <option
                                key={
                                  registration.id
                                }
                                value={
                                  registration.id
                                }
                                disabled={
                                  Boolean(
                                    assignment,
                                  ) &&
                                  !isCurrent
                                }
                              >
                                {registration.household_name ??
                                  registration.username}
                                {!isCurrent &&
                                currentCabin
                                  ? ` · move from ${currentCabin}`
                                  : ""}
                              </option>
                            );
                          },
                        )}
                      </NativeSelect.Field>

                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Stack>
                </Box>
              );
            })}
          </Grid>
        ) : (
          <Box
            p="8"
            textAlign="center"
          >
            <Text color="gray.500">
              No cabins yet.
            </Text>
          </Box>
        )}
      </Box>

    </Box>
  );
}
