import {
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import type {
  EventRegistration,
} from "@appoponi/shared/schemas/registration";

import CampMapBase, {
  CAMP_MAP_CABINS,
  CAMP_MAP_FEATURES,
  CAMP_MAP_HEIGHT,
  CAMP_MAP_WIDTH,
  type CampMapFeature,
} from "./CampMapBase";

type Props = {
  registration: EventRegistration;
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

function labelLines(name: string) {
  if (name.length <= 12) {
    return [name];
  }

  const words = name.split(" ");

  if (words.length === 1) {
    return [name];
  }

  const midpoint =
    Math.ceil(words.length / 2);

  return [
    words.slice(0, midpoint).join(" "),
    words.slice(midpoint).join(" "),
  ];
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
    feature.x + feature.width / 2;

  const centerY =
    feature.y + feature.height / 2;

  const lines =
    feature.kind === "cabin"
      ? []
      : labelLines(feature.name);

  return (
    <g
      className={`member-map-place member-map-place-${feature.kind} ${
        selected ? "selected" : ""
      }`}
      role="button"
      tabIndex={0}
      aria-label={feature.name}
      onClick={onSelect}
      onKeyDown={(event) =>
        keyActivates(
          event,
          onSelect,
        )
      }
    >
      <title>{feature.name}</title>

      {feature.shape === "ellipse" ? (
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={feature.width / 2}
          ry={feature.height / 2}
        />
      ) : (
        <rect
          x={feature.x}
          y={feature.y}
          width={feature.width}
          height={feature.height}
          rx={
            feature.kind === "cabin"
              ? 5
              : 10
          }
        />
      )}

      {lines.map(
        (line, index) => (
          <text
            key={line}
            x={centerX}
            y={
              centerY +
              (index -
                (lines.length - 1) /
                  2) *
                15
            }
            className="member-map-place-label"
          >
            {line.toUpperCase()}
          </text>
        ),
      )}
    </g>
  );
}

export default function MemberCampMap({
  registration,
}: Props) {
  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const allPlaces = useMemo(
    () => [
      ...CAMP_MAP_FEATURES,
      ...CAMP_MAP_CABINS,
    ],
    [],
  );

  const selectedPlace =
    allPlaces.find(
      (item) =>
        item.id === selectedId,
    ) ?? null;

  const cabinPoint = useMemo(() => {
    const x =
      registration.cabin_map_x;

    const y =
      registration.cabin_map_y;

    if (
      !registration.cabin_name ||
      x === null ||
      y === null
    ) {
      return null;
    }

    return {
      x:
        Math.max(
          0,
          Math.min(1, x),
        ) * CAMP_MAP_WIDTH,
      y:
        Math.max(
          0,
          Math.min(1, y),
        ) * CAMP_MAP_HEIGHT,
    };
  }, [registration]);

  const selectedName =
    selectedId === "your-cabin"
      ? registration.cabin_name
      : selectedPlace?.name ??
        null;

  const selectedDescription =
    selectedId === "your-cabin"
      ? "Your assigned cabin"
      : selectedPlace?.kind ===
          "building"
        ? "Camp building"
        : selectedPlace?.kind ===
            "activity"
          ? "Activity area"
          : selectedPlace?.kind ===
              "cabin"
            ? "Cabin"
            : null;

  return (
    <section className="member-card member-map-card">
      <div className="member-card-head member-map-head">
        <div>
          <strong>Camp map</strong>

          <span>
            Tap a place for details.
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

          <g className="member-map-places">
            {allPlaces.map(
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

            {cabinPoint && (
              <g
                className={`member-map-your-cabin ${
                  selectedId ===
                  "your-cabin"
                    ? "selected"
                    : ""
                }`}
                role="button"
                tabIndex={0}
                aria-label={`Your cabin: ${registration.cabin_name}`}
                transform={`translate(${cabinPoint.x} ${cabinPoint.y})`}
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
                <circle r="15" />
                <circle r="5" />
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
        ) : (
          <>
            <strong>
              {registration.cabin_name
                ? `Your cabin: ${registration.cabin_name}`
                : "Camp Mataponi"}
            </strong>

            <span>
              Tap a place for details.
            </span>
          </>
        )}
      </div>
    </section>
  );
}
