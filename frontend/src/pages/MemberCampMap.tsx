import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

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
    <g
      className={`member-map-place member-map-place-${feature.kind} ${
        selected
          ? "selected"
          : ""
      }`}
      role="button"
      tabIndex={0}
      aria-label={
        feature.name
      }
      onClick={onSelect}
      onKeyDown={(
        event,
      ) =>
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

    </g>
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
    <section className="app-card member-card member-map-card">
      <div className="app-card-head member-map-head">
        <div>
          <strong>
            Camp map
          </strong>

          <span>
            {registration.cabin_name && assignedCabinSlot
              ? `${registration.cabin_name} is highlighted. Use Map from your itinerary to locate meals and activities.`
              : registration.cabin_name
                ? `${registration.cabin_name} is assigned; its map location has not been set yet.`
                : "Use Map from your itinerary to locate meals and activities."}
          </span>
        </div>
      </div>

      <div className="member-map-shell">
        <svg
          className="member-map-svg"
          viewBox={`0 0 ${CAMP_MAP_WIDTH} ${CAMP_MAP_HEIGHT}`}
          role="img"
          aria-label="Camp Mataponi map"
        >
          <CampMapBase />

          <g className="member-map-cabin-slots">
            {CAMP_MAP_CABINS.map((slot) => (
              <CampCabinShape
                key={slot.id}
                slot={slot}
                className="member-map-cabin-slot"
              />
            ))}
          </g>

          <g className="member-map-places">
            {CAMP_MAP_FEATURES.map(
              (feature) => (
                <InteractiveFeature
                  key={
                    feature.id
                  }
                  feature={
                    feature
                  }
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
                <g
                  className={`member-map-assigned-cabin ${
                    selectedId ===
                    "your-cabin"
                      ? "selected"
                      : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Your cabin: ${registration.cabin_name}`}
                  onClick={() =>
                    setSelectedId(
                      "your-cabin",
                    )
                  }
                  onKeyDown={(
                    event,
                  ) =>
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
                    className="member-map-assigned-cabin-shape"
                  />

                  <text
                    x={
                      assignedCabinSlot.x +
                      assignedCabinSlot.width /
                        2
                    }
                    y={
                      assignedCabinSlot.y -
                      12
                    }
                  >
                    {
                      registration
                        .cabin_name
                    }
                  </text>
                </g>
              )}
          </g>
        </svg>
      </div>

      <div
        className="member-map-detail"
        aria-live="polite"
      >
        {selectedName ? (
          <>
            <strong>
              {selectedName}
            </strong>

            <span>
              {
                selectedDescription
              }
            </span>
          </>
        ) : registration
            .cabin_name ? (
          <>
            <strong>
              Your cabin:{" "}
              {
                registration
                  .cabin_name
              }
            </strong>

            <span>
              {assignedCabinSlot
                ? "Highlighted on the map."
                : "Assigned to your household. An admin still needs to set its map location."}
            </span>
          </>
        ) : (
          <>
            <strong>
              Camp Mataponi
            </strong>

            <span>
              Tap a place for
              details.
            </span>
          </>
        )}
      </div>
    </section>
  );
}
