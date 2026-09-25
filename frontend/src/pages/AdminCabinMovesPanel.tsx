import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  NativeSelect,
  Stack,
  Text,
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
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import {
  assignRegistrationCabinsBulk,
  loadCabins,
} from "../api/admin";

const UNASSIGNED =
  "__unassigned__";

type Props = {
  registrations: EventRegistration[];
  onChanged: () =>
    Promise<void> | void;
};

export default function AdminCabinMovesPanel({
  registrations,
  onChanged,
}: Props) {
  const [cabins, setCabins] =
    useState<Cabin[]>([]);

  const [
    draftTargets,
    setDraftTargets,
  ] = useState<
    Record<string, string>
  >({});

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    void loadCabins()
      .then(setCabins)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load cabins",
        ),
      );
  }, []);

  useEffect(() => {
    setDraftTargets({});
  }, [registrations]);

  const cabinNameById =
    useMemo(
      () =>
        new Map(
          cabins.map(
            (cabin) => [
              cabin.id,
              cabin.name,
            ],
          ),
        ),
      [cabins],
    );

  const currentOccupancy =
    useMemo(
      () =>
        new Map(
          registrations
            .filter(
              (registration) =>
                registration.cabin_id,
            )
            .map(
              (registration) => [
                registration.cabin_id!,
                registration.id,
              ],
            ),
        ),
      [registrations],
    );

  const openCabins =
    useMemo(
      () =>
        cabins.filter(
          (cabin) =>
            !currentOccupancy.has(
              cabin.id,
            ),
        ),
      [
        cabins,
        currentOccupancy,
      ],
    );

  const reservedByRegistration =
    useMemo(() => {
      const result =
        new Map<
          string,
          string
        >();

      for (
        const [
          registrationId,
          cabinId,
        ] of Object.entries(
          draftTargets,
        )
      ) {
        if (
          cabinId !==
          UNASSIGNED
        ) {
          result.set(
            cabinId,
            registrationId,
          );
        }
      }

      return result;
    }, [draftTargets]);

  function currentValue(
    registration: EventRegistration,
  ) {
    return (
      registration.cabin_id ??
      UNASSIGNED
    );
  }

  function targetValue(
    registration: EventRegistration,
  ) {
    return (
      draftTargets[
        registration.id
      ] ??
      currentValue(
        registration,
      )
    );
  }

  function setTarget(
    registration: EventRegistration,
    value: string,
  ) {
    setDraftTargets(
      (current) => {
        const next = {
          ...current,
        };

        if (
          value ===
          currentValue(
            registration,
          )
        ) {
          delete next[
            registration.id
          ];
        } else {
          next[
            registration.id
          ] = value;
        }

        return next;
      },
    );

    setError(null);
  }

  const changedRegistrations =
    registrations.filter(
      (registration) =>
        targetValue(
          registration,
        ) !==
        currentValue(
          registration,
        ),
    );

  const pendingTargetIds =
    new Set(
      changedRegistrations
        .map(
          (registration) =>
            targetValue(
              registration,
            ),
        )
        .filter(
          (value) =>
            value !==
            UNASSIGNED,
        ),
    );

  const openAfterDraft =
    openCabins.filter(
      (cabin) =>
        !pendingTargetIds.has(
          cabin.id,
        ),
    ).length;

  async function applyChanges() {
    if (
      !changedRegistrations.length
    ) {
      return;
    }

    if (
      !window.confirm(
        `Apply ${changedRegistrations.length} cabin ${changedRegistrations.length === 1 ? "change" : "changes"}? Only cabins that are open now can be used as destinations.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await assignRegistrationCabinsBulk(
        changedRegistrations.map(
          (registration) => {
            const target =
              targetValue(
                registration,
              );

            return {
              registration_id:
                Number(
                  registration.id,
                ),
              cabin_id:
                target ===
                UNASSIGNED
                  ? null
                  : Number(
                      target,
                    ),
            };
          },
        ),
      );

      setDraftTargets({});

      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not apply cabin changes",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      data-testid="cabin-moves-panel"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      overflow="hidden"
    >
      <Box
        px={{
          base: "4",
          md: "5",
        }}
        py="4"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <Stack gap="4">
          <HStack
            justifyContent="space-between"
            alignItems={{
              base: "flex-start",
              md: "center",
            }}
            flexWrap="wrap"
            gap="3"
          >
            <Stack gap="0">
              <Text
                fontWeight="800"
                fontSize="lg"
              >
                Cabin moves
              </Text>

              <Text
                fontSize="sm"
                color="gray.500"
              >
                Put households into open cabins quickly. Stage several changes, then apply them together.
              </Text>
            </Stack>

            <HStack gap="2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  busy ||
                  !changedRegistrations.length
                }
                onClick={() =>
                  setDraftTargets(
                    {},
                  )
                }
              >
                Reset
              </Button>

              <Button
                type="button"
                size="sm"
                colorPalette="green"
                disabled={
                  busy ||
                  !changedRegistrations.length
                }
                onClick={() =>
                  void applyChanges()
                }
              >
                {busy
                  ? "Applying…"
                  : `Apply ${changedRegistrations.length} ${changedRegistrations.length === 1 ? "change" : "changes"}`}
              </Button>
            </HStack>
          </HStack>

          <Grid
            templateColumns={{
              base: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            }}
            gap="2"
          >
            <Box
              p="3"
              bg="gray.50"
              borderRadius="lg"
            >
              <Text
                fontSize="xs"
                color="gray.500"
              >
                Households
              </Text>

              <Text
                fontWeight="800"
                fontSize="lg"
              >
                {registrations.length}
              </Text>
            </Box>

            <Box
              p="3"
              bg="gray.50"
              borderRadius="lg"
            >
              <Text
                fontSize="xs"
                color="gray.500"
              >
                Occupied
              </Text>

              <Text
                fontWeight="800"
                fontSize="lg"
              >
                {currentOccupancy.size}
              </Text>
            </Box>

            <Box
              p="3"
              bg="gray.50"
              borderRadius="lg"
            >
              <Text
                fontSize="xs"
                color="gray.500"
              >
                Open now
              </Text>

              <Text
                fontWeight="800"
                fontSize="lg"
              >
                {openCabins.length}
              </Text>
            </Box>

            <Box
              p="3"
              bg="gray.50"
              borderRadius="lg"
            >
              <Text
                fontSize="xs"
                color="gray.500"
              >
                Still open after draft
              </Text>

              <Text
                fontWeight="800"
                fontSize="lg"
              >
                {openAfterDraft}
              </Text>
            </Box>
          </Grid>

          {error && (
            <Box
              p="3"
              bg="red.50"
              borderWidth="1px"
              borderColor="red.200"
              borderRadius="md"
            >
              <Text
                fontSize="sm"
                color="red.700"
              >
                {error}
              </Text>
            </Box>
          )}
        </Stack>
      </Box>

      {registrations.length ? (
        <Stack gap="0">
          {registrations.map(
            (registration) => {
              const currentCabin =
                registration.cabin_id
                  ? cabinNameById.get(
                      registration.cabin_id,
                    ) ??
                    registration.cabin_name ??
                    "Unknown cabin"
                  : "Unassigned";

              const target =
                targetValue(
                  registration,
                );

              const changed =
                target !==
                currentValue(
                  registration,
                );

              const householdName =
                registration.household_name ??
                registration.username;

              return (
                <Box
                  key={
                    registration.id
                  }
                  px={{
                    base: "4",
                    md: "5",
                  }}
                  py="4"
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  bg={
                    changed
                      ? "green.50"
                      : "white"
                  }
                >
                  <Grid
                    templateColumns={{
                      base: "1fr",
                      lg: "minmax(220px, 1.5fr) minmax(150px, .7fr) minmax(260px, 1fr)",
                    }}
                    gap="4"
                    alignItems="center"
                  >
                    <Stack gap="0">
                      <HStack gap="2">
                        <Text
                          fontWeight="800"
                        >
                          {householdName}
                        </Text>

                        {changed && (
                          <Badge
                            colorPalette="green"
                          >
                            Pending
                          </Badge>
                        )}
                      </HStack>

                      <Text
                        fontSize="sm"
                        color="gray.500"
                      >
                        {registration.selected_attendees}/{registration.spots_paid_for} attending
                      </Text>
                    </Stack>

                    <Stack gap="0">
                      <Text
                        fontSize="xs"
                        color="gray.500"
                      >
                        Current
                      </Text>

                      <Text
                        fontWeight="700"
                      >
                        {currentCabin}
                      </Text>
                    </Stack>

                    <NativeSelect.Root>
                      <NativeSelect.Field
                        aria-label={`Destination for ${householdName}`}
                        value={
                          target
                        }
                        onChange={(
                          event,
                        ) =>
                          setTarget(
                            registration,
                            event.target
                              .value,
                          )
                        }
                      >
                        <option
                          value={
                            UNASSIGNED
                          }
                        >
                          Unassigned
                        </option>

                        {registration.cabin_id && (
                          <option
                            value={
                              registration.cabin_id
                            }
                          >
                            Keep {currentCabin}
                          </option>
                        )}

                        {openCabins.map(
                          (cabin) => {
                            const reservedBy =
                              reservedByRegistration.get(
                                cabin.id,
                              );

                            const reservedByOther =
                              Boolean(
                                reservedBy &&
                                reservedBy !==
                                  registration.id,
                              );

                            return (
                              <option
                                key={
                                  cabin.id
                                }
                                value={
                                  cabin.id
                                }
                                disabled={
                                  reservedByOther
                                }
                              >
                                {cabin.name}
                                {reservedByOther
                                  ? " · reserved in this draft"
                                  : ""}
                              </option>
                            );
                          },
                        )}
                      </NativeSelect.Field>

                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Grid>
                </Box>
              );
            },
          )}
        </Stack>
      ) : (
        <Box
          p="8"
          textAlign="center"
        >
          <Text color="gray.500">
            No registered households for this event.
          </Text>
        </Box>
      )}
    </Box>
  );
}
