import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import {
  Box,
  Text,
  chakra,
} from "@chakra-ui/react";

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import type {
  CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

import CampMapBase, {
  CAMP_MAP_CABINS,
  CAMP_MAP_FEATURES,
  CampCabinShape,
  CAMP_MAP_HEIGHT,
  CAMP_MAP_WIDTH,
  findCampCabinSlotById,
  type CampMapFeature,
} from "./CampMapBase";

type Props = {
  registration: EventRegistration;
  focusTarget?: CampMapPlaceId | null;
};

function keyActivates(
  event: KeyboardEvent<SVGGElement>,
  action: () => void,
) {
  if (
    event.key === "Enter" ||
    event.key === " "
  ) {
    event.preventDefault();
    action();
  }
}

function InteractiveFeature({
  feature,
  selected,
  onSelect,
}: {
  feature: CampMapFeature;
  selected: boolean;
  onSelect: () => void;
}) {
  const centerX =
    feature.x +
    feature.width / 2;

  const centerY =
    feature.y +
    feature.height / 2;

  const featureTransform =
    feature.rotate
      ? `rotate(${feature.rotate} ${centerX} ${centerY})`
      : undefined;

  return (
    <chakra.g
      role="button"
      tabIndex={0}
      aria-label={feature.name}
      cursor="pointer"
      outline="none"
      css={{
        "& rect, & ellipse": {
          fill: "transparent",
          stroke: selected
            ? "#007854"
            : "transparent",
          strokeWidth: selected
            ? 2.25
            : 1.5,
          vectorEffect:
            "non-scaling-stroke",
        },
        "&:hover rect, &:hover ellipse, &:focus-visible rect, &:focus-visible ellipse":
          {
            fill: "transparent",
            stroke: selected
              ? "#007854"
              : "#9ccfbd",
          },
      }}
      onClick={onSelect}
      onKeyDown={(event) =>
        keyActivates(
          event,
          onSelect,
        )
      }
    >
      <title>
        {feature.name}
      </title>

      {feature.shape ===
      "ellipse" ? (
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={
            feature.width /
            2
          }
          ry={
            feature.height /
            2
          }
          transform={featureTransform}
        />
      ) : (
        <rect
          x={feature.x}
          y={feature.y}
          width={
            feature.width
          }
          height={
            feature.height
          }
          rx="10"
          transform={featureTransform}
        />
      )}
    </chakra.g>
  );
}

export default function MemberCampMap({
  registration,
  focusTarget = null,
}: Props) {
  const [
    selectedId,
    setSelectedId,
  ] = useState<
    CampMapPlaceId | null
  >(null);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    if (
      focusTarget === "your-cabin" ||
      CAMP_MAP_FEATURES.some((item) => item.id === focusTarget)
    ) {
      setSelectedId(focusTarget);
    }
  }, [focusTarget]);

  const selectedPlace =
    CAMP_MAP_FEATURES.find(
      (item) =>
        item.id ===
        selectedId,
    ) ?? null;

  const assignedCabinSlot =
    useMemo(
      () =>
        findCampCabinSlotById(
          registration
            .cabin_map_slot_id,
        ),
      [registration],
    );

  const selectedName =
    selectedId ===
    "your-cabin"
      ? registration
          .cabin_name
      : selectedPlace?.name ??
        null;

  const selectedDescription =
    selectedId ===
    "your-cabin"
      ? "Your assigned cabin"
      : selectedPlace?.kind ===
          "building"
        ? "Camp building"
        : selectedPlace?.kind ===
            "activity"
          ? "Activity area"
          : null;

  return (
    <Box
      as="section"
      mb="18px"
      overflow="hidden"
      borderWidth="1px"
      borderColor="#dddcd5"
      borderRadius="12px"
      bg="#ffffff"
    >
      <Box
        minH="58px"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="12px"
        px="16px"
        py="13px"
        borderBottomWidth="1px"
        borderColor="#dddcd5"
      >
        <Box
          minW="0"
          display="flex"
          flexDirection="column"
          gap="3px"
        >
          <Text
            as="strong"
            fontWeight="700"
          >
            Camp map
          </Text>

          <Text
            as="span"
            color="#6d7169"
            fontSize="11px"
          >
            {registration.cabin_name && assignedCabinSlot
              ? `${registration.cabin_name} is highlighted. Use Map from your itinerary to locate meals and activities.`
              : registration.cabin_name
                ? `${registration.cabin_name} is assigned; its map location has not been set yet.`
                : "Use Map from your itinerary to locate meals and activities."}
          </Text>
        </Box>
      </Box>

      <Box
        position="relative"
        overflow="hidden"
        p="8px"
        bg="#fbfaf7"
      >
        <chakra.svg
          viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
          role="img"
          aria-label="Camp Mataponi map"
          w="min(100%, 820px)"
          h="auto"
          display="block"
          mx="auto"
          maxH="650px"
          overflow="hidden"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
          css={{
            "@media (max-width: 760px)": {
              maxHeight: "none",
            },
          }}
        >
          <CampMapBase />

          <g>
            {CAMP_MAP_CABINS.map((slot) => (
              <CampCabinShape
                key={slot.id}
                slot={slot}
                state="hidden"
              />
            ))}
          </g>

          <g>
            {CAMP_MAP_FEATURES.map(
              (feature) => (
                <InteractiveFeature
                  key={feature.id}
                  feature={feature}
                  selected={
                    selectedId ===
                    feature.id
                  }
                  onSelect={() =>
                    setSelectedId(
                      feature.id,
                    )
                  }
                />
              ),
            )}

            {registration
              .cabin_name &&
              assignedCabinSlot && (
                <chakra.g
                  role="button"
                  tabIndex={0}
                  aria-label={`Your cabin: ${registration.cabin_name}`}
                  cursor="pointer"
                  outline="none"
                  onClick={() =>
                    setSelectedId(
                      "your-cabin",
                    )
                  }
                  onKeyDown={(event) =>
                    keyActivates(
                      event,
                      () =>
                        setSelectedId(
                          "your-cabin",
                        ),
                    )
                  }
                >
                  <CampCabinShape
                    slot={assignedCabinSlot}
                    state="selected"
                  />

                  <chakra.text
                    x={
                      assignedCabinSlot.x +
                      assignedCabinSlot.width /
                        2
                    }
                    y={
                      assignedCabinSlot.y -
                      12
                    }
                    fill="#005d41"
                    fontSize="11px"
                    fontWeight="800"
                    textAnchor="middle"
                    paintOrder="stroke"
                    stroke="#f8f7f2"
                    strokeWidth="4px"
                    pointerEvents="none"
                  >
                    {
                      registration
                        .cabin_name
                    }
                  </chakra.text>
                </chakra.g>
              )}
          </g>
        </chakra.svg>
      </Box>

      <Box
        minH="46px"
        display="flex"
        flexDirection="column"
        gap="2px"
        px="14px"
        py="10px"
        borderTopWidth="1px"
        borderColor="#dddcd5"
        aria-live="polite"
      >
        {selectedName ? (
          <>
            <Text
              as="strong"
              fontWeight="700"
            >
              {selectedName}
            </Text>

            <Text
              as="span"
              color="#6d7169"
              fontSize="10px"
            >
              {selectedDescription}
            </Text>
          </>
        ) : registration
            .cabin_name ? (
          <>
            <Text
              as="strong"
              fontWeight="700"
            >
              Your cabin:{" "}
              {
                registration
                  .cabin_name
              }
            </Text>

            <Text
              as="span"
              color="#6d7169"
              fontSize="10px"
            >
              {assignedCabinSlot
                ? "Highlighted on the map."
                : "Assigned to your household. An admin still needs to set its map location."}
            </Text>
          </>
        ) : (
          <>
            <Text
              as="strong"
              fontWeight="700"
            >
              Camp Mataponi
            </Text>

            <Text
              as="span"
              color="#6d7169"
              fontSize="10px"
            >
              Tap a place for
              details.
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}
