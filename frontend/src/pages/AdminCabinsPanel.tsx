import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  Area,
} from "@appoponi/shared/schemas/areas";
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
  createCabin,
  deleteCabin,
  loadCabinAreas,
  loadCabins,
  loadRegistrations,
  updateCabin,
} from "../api/admin";

import CampMapBase, {
  CAMP_MAP_CABINS,
  CAMP_MAP_HEIGHT,
  CampCabinShape,
  CAMP_MAP_WIDTH,
  findCampCabinSlotById,
  type CampMapCabinFeature,
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
  const [areas, setAreas] =
    useState<Area[]>([]);
  const [registrations, setRegistrations] =
    useState<EventRegistration[]>([]);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [placingCabinId, setPlacingCabinId] =
    useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] =
    useState<CampCabinSlotId | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [showManageCabins, setShowManageCabins] =
    useState(false);

  async function refresh() {
    const [
      nextCabins,
      nextAreas,
      nextRegistrations,
    ] = await Promise.all([
      loadCabins(),
      loadCabinAreas(),
      loadRegistrations(),
    ]);

    setCabins(nextCabins);
    setAreas(nextAreas);
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

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Cabin name is required.");
      return;
    }

    void run(async () => {
      const created = await createCabin({
        name: name.trim(),
        area_id: areaId
          ? Number(areaId)
          : null,
        map_slot_id: null,
      });

      setName("");
      setAreaId("");
      setPlacingCabinId(created.id);
      setSelectedSlotId(null);
    });
  }

  const placingCabin = useMemo(
    () =>
      cabins.find(
        (cabin) =>
          cabin.id === placingCabinId,
      ) ?? null,
    [cabins, placingCabinId],
  );

  const cabinSlots = useMemo(() => {
    const result = new Map<
      string,
      CampMapCabinFeature
    >();

    for (const cabin of cabins) {
      const slot = findCampCabinSlotById(
        cabin.map_slot_id,
      );

      if (slot) {
        result.set(cabin.id, slot);
      }
    }

    return result;
  }, [cabins]);

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

  function startPlacement(cabin: Cabin) {
    setPlacingCabinId(cabin.id);
    setSelectedSlotId(
      cabin.map_slot_id,
    );
    setError(null);
  }

  function chooseSlot(
    slot: CampMapCabinFeature,
  ) {
    if (!placingCabin) {
      return;
    }

    const owner = slotOwners.get(slot.id);

    if (
      owner &&
      owner.id !== placingCabin.id
    ) {
      setError(
        `${owner.name} already uses that map cabin.`,
      );
      return;
    }

    setSelectedSlotId(slot.id);
    setError(null);
  }

  function savePlacement() {
    if (
      !placingCabin ||
      !selectedSlotId
    ) {
      setError(
        "Choose a cabin building on the map.",
      );
      return;
    }

    const owner =
      slotOwners.get(selectedSlotId);

    if (
      owner &&
      owner.id !== placingCabin.id
    ) {
      setError(
        `${owner.name} already uses that map cabin.`,
      );
      return;
    }

    void run(async () => {
      await updateCabin(
        placingCabin.id,
        {
          map_slot_id:
            selectedSlotId,
        },
      );

      setPlacingCabinId(null);
      setSelectedSlotId(null);
    });
  }

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
        display="flex"
        flexDirection={{
          base: "column",
          md: "row",
        }}
        alignItems={{
          base: "stretch",
          md: "center",
        }}
        justifyContent="space-between"
        gap="4"
      >
        <Stack gap="0">
          <Text fontWeight="700">
            Cabins on the camp map
          </Text>

          <Text
            fontSize="sm"
            color="gray.500"
          >
            Assign households to real cabins. Choose a household on an available cabin to move them there.
          </Text>
        </Stack>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setShowManageCabins(
              (open) => !open,
            )
          }
        >
          {showManageCabins
            ? "Close cabin setup"
            : "Manage cabins"}
        </Button>
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

      {showManageCabins && (
        <Box
          bg="gray.50"
          px="4"
          py="4"
          borderBottomWidth="1px"
          borderColor="gray.200"
        >
          <Box
            as="form"
            onSubmit={submit}
          >
            <Grid
              templateColumns={{
                base: "1fr",
                md: "minmax(180px, 1fr) minmax(180px, .8fr) auto",
              }}
              gap="3"
              alignItems="end"
            >
              <Field.Root>
                <Field.Label>
                  Cabin name
                </Field.Label>

                <Input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="Cabin 14"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  Area
                </Field.Label>

                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={areaId}
                    onChange={(event) =>
                      setAreaId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      No area
                    </option>

                    {areas.map(
                      (area) => (
                        <option
                          key={area.id}
                          value={area.id}
                        >
                          {area.name}
                        </option>
                      ),
                    )}
                  </NativeSelect.Field>

                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Button
                type="submit"
                colorPalette="green"
              >
                Add cabin
              </Button>
            </Grid>
          </Box>
        </Box>
      )}

      <Grid
        templateColumns={{
          base: "1fr",
          xl: "minmax(0, 1fr) minmax(300px, 360px)",
        }}
        minH={{
          xl: "420px",
        }}
      >
        <Box
          minW="0"
          display="grid"
          placeItems="center"
          p="3"
          bg="#f8f7f2"
          borderRightWidth={{
            base: "0",
            xl: "1px",
          }}
          borderBottomWidth={{
            base: "1px",
            xl: "0",
          }}
          borderColor="gray.200"
        >
          <chakra.svg
            viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
            role="img"
            aria-label="Camp cabin assignments"
            w="full"
            maxH="620px"
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

                const assignments =
                  owner
                    ? assignmentsFor(
                        owner.id,
                      )
                    : [];

                const assignment =
                  assignments[0] ??
                  null;

                const centerX =
                  slot.x +
                  slot.width / 2;

                return (
                  <g key={slot.id}>
                    <CampCabinShape
                      slot={slot}

                      state={
                        assignment
                          ? "assigned"
                          : owner
                            ? "placed"
                            : "hidden"
                      }
                    />

                    {owner && (
                      <text
                        x={centerX}
                        y={slot.y - 8}
                      >
                        {owner.name}
                      </text>
                    )}
                  </g>
                );
              },
            )}
          </chakra.svg>
        </Box>

        <Stack
          gap="0"
          overflow="auto"
        >
          {cabins.length ? (
            cabins.map((cabin) => {
              const assignments =
                assignmentsFor(
                  cabin.id,
                );

              const assignment =
                assignments[0] ??
                null;

              const slot =
                cabinSlots.get(
                  cabin.id,
                );

              return (
                <Box
                  key={cabin.id}
                  px="4"
                  py="3"
                  borderBottomWidth="1px"
                  borderColor="gray.200"
                >
                  <Grid
                    templateColumns={{
                      base: "1fr",
                      sm: "minmax(92px, .65fr) minmax(170px, 1.35fr)",
                    }}
                    alignItems="center"
                    gap="3"
                  >
                    <Stack gap="0">
                      <Text fontWeight="700">
                        {cabin.name}
                      </Text>

                      <Text
                        fontSize="xs"
                        color="gray.500"
                      >
                        {slot
                          ? "On map"
                          : "Map location not set"}
                      </Text>
                    </Stack>

                    <Field.Root>
                      <Field.Label
                        fontSize="xs"
                        color="gray.500"
                      >
                        Household
                      </Field.Label>

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
                    </Field.Root>
                  </Grid>
                </Box>
              );
            })
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
        </Stack>
      </Grid>

      <Box
        borderTopWidth="1px"
        borderColor="gray.200"
      >
        <details>
          <Box
            as="summary"
            cursor="pointer"
            px="5"
            py="4"
          >
            <Box
              display="flex"
              flexDirection={{
                base: "column",
                sm: "row",
              }}
              justifyContent="space-between"
              alignItems={{
                base: "flex-start",
                sm: "center",
              }}
              gap="3"
            >
              <Stack gap="0">
                <Text fontWeight="700">
                  Cabin records
                </Text>

                <Text
                  fontSize="sm"
                  color="gray.500"
                >
                  {cabins.length} reusable cabins · edit names, areas, or delete unused cabins.
                </Text>
              </Stack>

              <Text
                fontSize="sm"
                fontWeight="700"
                color="gray.600"
              >
                Manage records
              </Text>
            </Box>
          </Box>

          <Box
            borderTopWidth="1px"
            borderColor="gray.200"
          >
            {cabins.length ? (
              <Stack gap="0">
                {cabins.map(
                  (cabin) => {
                    const assignments =
                      assignmentsFor(
                        cabin.id,
                      );

                    const slot =
                      cabinSlots.get(
                        cabin.id,
                      );

                    return (
                      <Box
                        key={cabin.id}
                        px="4"
                        py="3"
                        borderBottomWidth="1px"
                        borderColor="gray.200"
                      >
                        <Grid
                          templateColumns={{
                            base: "1fr",
                            lg: "minmax(260px, 1.15fr) minmax(190px, .9fr) minmax(170px, .55fr) auto",
                          }}
                          alignItems="center"
                          gap="4"
                        >
                          <Grid
                            templateColumns={{
                              base: "1fr",
                              md: "minmax(110px, .7fr) minmax(150px, 1fr)",
                            }}
                            gap="2"
                          >
                            <Input
                              aria-label="Cabin name"
                              defaultValue={
                                cabin.name
                              }
                              onBlur={(
                                event,
                              ) => {
                                const next =
                                  event.target.value.trim();

                                if (
                                  next &&
                                  next !==
                                    cabin.name
                                ) {
                                  void run(
                                    () =>
                                      updateCabin(
                                        cabin.id,
                                        {
                                          name: next,
                                        },
                                      ),
                                  );
                                }
                              }}
                            />

                            <NativeSelect.Root>
                              <NativeSelect.Field
                                aria-label="Cabin area"
                                value={
                                  cabin.area_id ??
                                  ""
                                }
                                onChange={(
                                  event,
                                ) =>
                                  void run(
                                    () =>
                                      updateCabin(
                                        cabin.id,
                                        {
                                          area_id:
                                            event
                                              .target
                                              .value
                                              ? Number(
                                                  event
                                                    .target
                                                    .value,
                                                )
                                              : null,
                                        },
                                      ),
                                  )
                                }
                              >
                                <option value="">
                                  No area
                                </option>

                                {areas.map(
                                  (
                                    area,
                                  ) => (
                                    <option
                                      key={
                                        area.id
                                      }
                                      value={
                                        area.id
                                      }
                                    >
                                      {
                                        area.name
                                      }
                                    </option>
                                  ),
                                )}
                              </NativeSelect.Field>

                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                          </Grid>

                          {assignments.length ? (
                            <Stack gap="1">
                              {assignments.map(
                                (item) => (
                                  <Stack
                                    key={
                                      item.id
                                    }
                                    gap="0"
                                  >
                                    <Text
                                      fontSize="sm"
                                      fontWeight="700"
                                    >
                                      {item.household_name ??
                                        item.username}
                                    </Text>

                                    <Text
                                      fontSize="xs"
                                      color="gray.500"
                                    >
                                      {
                                        item.event_name
                                      }
                                    </Text>
                                  </Stack>
                                ),
                              )}
                            </Stack>
                          ) : (
                            <Text
                              fontSize="sm"
                              color="gray.500"
                            >
                              Available
                            </Text>
                          )}

                          <HStack
                            flexWrap="wrap"
                          >
                            <Badge
                              colorPalette={
                                slot
                                  ? "green"
                                  : "gray"
                              }
                            >
                              {slot
                                ? "On map"
                                : "Not placed"}
                            </Badge>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                startPlacement(
                                  cabin,
                                )
                              }
                            >
                              {slot
                                ? "Map location"
                                : "Place on map"}
                            </Button>
                          </HStack>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            colorPalette="red"
                            disabled={
                              assignments.length >
                              0
                            }
                            title={
                              assignments.length
                                ? "Reassign or unassign this cabin before deleting it"
                                : undefined
                            }
                            onClick={() =>
                              void run(() =>
                                deleteCabin(
                                  cabin.id,
                                ),
                              )
                            }
                          >
                            Delete
                          </Button>
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
                  No cabins yet.
                </Text>
              </Box>
            )}
          </Box>
        </details>
      </Box>

      {placingCabin && (
        <Box
          position="fixed"
          inset="0"
          zIndex="90"
          display="grid"
          placeItems="center"
          p={{
            base: "3",
            md: "6",
          }}
          bg="rgba(23, 25, 21, 0.34)"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPlacingCabinId(
                null,
              );
              setSelectedSlotId(
                null,
              );
            }
          }}
        >
          <Box
            as="section"
            role="dialog"
            aria-modal="true"
            aria-label={`Place ${placingCabin.name}`}
            w={{
              base: "calc(100vw - 24px)",
              md: "min(1060px, calc(100vw - 48px))",
            }}
            maxH={{
              base: "calc(100vh - 24px)",
              md: "calc(100vh - 48px)",
            }}
            overflow="auto"
            borderWidth="1px"
            borderColor="#dddcd5"
            borderRadius="12px"
            bg="white"
            boxShadow="0 16px 42px rgba(23, 25, 21, 0.14)"
          >
            <Box
              position="sticky"
              top="0"
              zIndex="2"
              bg="white"
              px="5"
              py="4"
              borderBottomWidth="1px"
              borderColor="gray.200"
              display="flex"
              flexDirection={{
                base: "column",
                sm: "row",
              }}
              justifyContent="space-between"
              alignItems={{
                base: "stretch",
                sm: "center",
              }}
              gap="4"
            >
              <Stack gap="0">
                <Text fontWeight="700">
                  Place {placingCabin.name}
                </Text>

                <Text
                  fontSize="sm"
                  color="gray.500"
                >
                  Choose the actual cabin building. Occupied map cabins cannot be reused.
                </Text>
              </Stack>

              <HStack>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPlacingCabinId(
                      null,
                    );
                    setSelectedSlotId(
                      null,
                    );
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  colorPalette="green"
                  disabled={
                    !selectedSlotId
                  }
                  onClick={
                    savePlacement
                  }
                >
                  Save location
                </Button>
              </HStack>
            </Box>

            <Box
              p="3"
              bg="#f8f7f2"
            >
              <chakra.svg
                viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
                role="img"
                aria-label={`Choose the physical map cabin for ${placingCabin.name}`}
                w="full"
                maxH="520px"
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

                    const isSelected =
                      selectedSlotId ===
                      slot.id;

                    const unavailable =
                      Boolean(owner) &&
                      owner?.id !==
                        placingCabin.id;

                    const centerX =
                      slot.x +
                      slot.width / 2;

                    return (
                      <chakra.g
                        key={slot.id}
                        role="button"
                        tabIndex={
                          unavailable
                            ? -1
                            : 0
                        }
                        aria-label={
                          unavailable
                            ? `Map cabin already used by ${owner?.name}`
                            : isSelected
                              ? `${placingCabin.name} selected here`
                              : "Available map cabin"
                        }
                        cursor={
                          unavailable
                            ? "not-allowed"
                            : "pointer"
                        }
                        opacity={
                          unavailable
                            ? "0.42"
                            : "1"
                        }
                        outline="none"
                        css={
                          unavailable
                            ? undefined
                            : {
                                "&:hover .camp-cabin-hitbox, &:focus-visible .camp-cabin-hitbox":
                                  {
                                    fill: "#ffffff",
                                    fillOpacity:
                                      0.2,
                                    stroke:
                                      "#007854",
                                  },
                              }
                        }
                        onClick={() =>
                          !unavailable &&
                          chooseSlot(
                            slot,
                          )
                        }
                        onKeyDown={(
                          event,
                        ) => {
                          if (
                            !unavailable &&
                            (event.key ===
                              "Enter" ||
                              event.key ===
                                " ")
                          ) {
                            event.preventDefault();
                            chooseSlot(
                              slot,
                            );
                          }
                        }}
                      >
                        <CampCabinShape
                          slot={slot}

                          state={
                            unavailable
                              ? "unavailable"
                              : isSelected
                                ? "selected"
                                : "hidden"
                          }
                        />

                        {(owner ||
                          isSelected) && (
                          <text
                            x={
                              centerX
                            }
                            y={
                              slot.y -
                              8
                            }
                            fill="#005d41"
                            fontSize="11px"
                            fontWeight="800"
                            textAnchor="middle"
                            paintOrder="stroke"
                            stroke="#f8f7f2"
                            strokeWidth="4"
                            pointerEvents="none"
                          >
                            {isSelected
                              ? placingCabin.name
                              : owner?.name}
                          </text>
                        )}
                      </chakra.g>
                    );
                  },
                )}
              </chakra.svg>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
