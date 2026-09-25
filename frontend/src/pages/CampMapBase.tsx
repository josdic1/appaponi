import campMapArtwork from "../assets/camp-mataponi-map.webp";

import type {
  CampCabinSlotId,
  CampMapPlaceId,
} from "@appoponi/shared/schemas/campMap";

export const CAMP_MAP_WIDTH = 1000;
export const CAMP_MAP_HEIGHT = 750;

export type CampMapFeatureKind =
  | "building"
  | "activity"
  | "cabin";

type CampMapStaticPlaceId = Exclude<
  CampMapPlaceId,
  "your-cabin"
>;

export type CampMapFeature = {
  id: CampMapStaticPlaceId;
  name: string;
  kind: CampMapFeatureKind;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: "rect" | "ellipse";
  rotate?: number;
  labelX?: number;
  labelY?: number;
};

/*
 * The illustrated map is fixed reference artwork. These overlay rectangles are
 * interaction targets only; stable place IDs remain the product/data truth.
 */
export const CAMP_MAP_FEATURES: CampMapFeature[] = [
  { id: "camp-fire", name: "Camp Fire", kind: "activity", x: 392, y: 404, width: 38, height: 38, shape: "ellipse" },
  { id: "field", name: "Field", kind: "activity", x: 530, y: 26, width: 178, height: 112 },
  { id: "mini-ropes", name: "Mini Ropes", kind: "activity", x: 736, y: 150, width: 102, height: 80 },
  { id: "rec-hall", name: "Rec Hall", kind: "building", x: 354, y: 126, width: 154, height: 94 },
  { id: "barn", name: "Barn", kind: "building", x: 771, y: 414, width: 62, height: 72 },
  { id: "riding", name: "Riding", kind: "activity", x: 795, y: 465, width: 122, height: 126, shape: "ellipse" },
  { id: "tennis", name: "Tennis", kind: "activity", x: 636, y: 274, width: 124, height: 105 },
  { id: "dining-hall", name: "Dining Hall", kind: "building", x: 414, y: 220, width: 132, height: 126 },
  { id: "arch-loons-house", name: "Arch Loons House", kind: "building", x: 626, y: 380, width: 86, height: 68 },
  { id: "lower-lodge", name: "Lower Lodge", kind: "building", x: 482, y: 386, width: 70, height: 48 },
  { id: "office", name: "Office", kind: "building", x: 650, y: 432, width: 55, height: 46 },
  { id: "gymnastics", name: "Gymnastics", kind: "activity", x: 353, y: 366, width: 62, height: 50 },
  { id: "boat-shed", name: "Boat Shed", kind: "building", x: 282, y: 376, width: 55, height: 44 },
  { id: "waterfront", name: "Waterfront", kind: "activity", x: 244, y: 326, width: 116, height: 92, shape: "ellipse" },
];

export type CampMapTargetId = CampMapPlaceId;

export type CampMapCabinFeature = {
  id: CampCabinSlotId;
  name: string;
  kind: "cabin";
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
};

/* Permanent reusable lodging positions aligned to the illustrated map. */
export const CAMP_MAP_CABINS: CampMapCabinFeature[] = [
  { id: "cabin-1", name: "Cabin 1", kind: "cabin", x: 396.3, y: 416.7, width: 29, height: 29 },
  { id: "cabin-2", name: "Cabin 2", kind: "cabin", x: 363.3, y: 429.5, width: 30, height: 29 },
  { id: "cabin-3", name: "Cabin 3", kind: "cabin", x: 384.6, y: 442.5, width: 31, height: 30 },
  { id: "cabin-4", name: "Cabin 4", kind: "cabin", x: 406.3, y: 455.6, width: 31, height: 32 },
  { id: "cabin-5", name: "Cabin 5", kind: "cabin", x: 540.3, y: 514.6, width: 33, height: 31 },
  { id: "cabin-6", name: "Cabin 6", kind: "cabin", x: 568.6, y: 542.5, width: 30, height: 31 },
  { id: "cabin-7", name: "Cabin 7", kind: "cabin", x: 583.6, y: 563.2, width: 25, height: 24 },
  { id: "cabin-8", name: "Cabin 8", kind: "cabin", x: 590.6, y: 575.3, width: 29, height: 31 },
  { id: "cabin-9", name: "Cabin 9", kind: "cabin", x: 602.2, y: 596.5, width: 28, height: 30 },
  { id: "cabin-10", name: "Cabin 10", kind: "cabin", x: 612.6, y: 617.8, width: 29, height: 31 },
  { id: "cabin-11", name: "Cabin 11", kind: "cabin", x: 592.5, y: 650.3, width: 23, height: 21 },
  { id: "cabin-12", name: "Cabin 12", kind: "cabin", x: 588.4, y: 636.4, width: 22, height: 22 },
  { id: "cabin-13", name: "Cabin 13", kind: "cabin", x: 628.6, y: 652.9, width: 23, height: 23 },
  { id: "cabin-14", name: "Cabin 14", kind: "cabin", x: 652.6, y: 626.5, width: 32, height: 30 },
  { id: "cabin-15", name: "Cabin 15", kind: "cabin", x: 677.8, y: 607.0, width: 30, height: 32 },
  { id: "cabin-16", name: "Cabin 16", kind: "cabin", x: 633.9, y: 601.5, width: 29, height: 28 },
  { id: "cabin-17", name: "Cabin 17", kind: "cabin", x: 680.4, y: 570.7, width: 36, height: 33 },
  { id: "cabin-18", name: "Cabin 18", kind: "cabin", x: 538.9, y: 579.6, width: 27, height: 30 },
  { id: "cabin-19", name: "Cabin 19", kind: "cabin", x: 146.1, y: 289.5, width: 24, height: 21 },
  { id: "cabin-20", name: "Cabin 20", kind: "cabin", x: 164.3, y: 304.3, width: 23, height: 25 },
  { id: "cabin-21", name: "Cabin 21", kind: "cabin", x: 186.4, y: 294.2, width: 22, height: 25 },
  { id: "cabin-22", name: "Cabin 22", kind: "cabin", x: 206.2, y: 297.3, width: 23, height: 25 },
  { id: "cabin-23", name: "Cabin 23", kind: "cabin", x: 223.1, y: 304.3, width: 24, height: 26 },
  { id: "cabin-24", name: "Cabin 24", kind: "cabin", x: 238.9, y: 315.5, width: 24, height: 25 },
  { id: "cabin-25", name: "Cabin 25", kind: "cabin", x: 253.4, y: 327.6, width: 25, height: 25 },
  { id: "cabin-26", name: "Cabin 26", kind: "cabin", x: 267.3, y: 340.6, width: 26, height: 26 },
  { id: "cabin-27", name: "Cabin 27", kind: "cabin", x: 284.3, y: 398.2, width: 39, height: 36 },
  { id: "cabin-28", name: "Cabin 28", kind: "cabin", x: 324.1, y: 382.4, width: 22, height: 20 },
  { id: "cabin-29", name: "Cabin 29", kind: "cabin", x: 353.5, y: 365.6, width: 40, height: 31 },
  { id: "cabin-30", name: "Cabin 30", kind: "cabin", x: 398.5, y: 379.5, width: 34, height: 28 },
  { id: "cabin-31", name: "Cabin 31", kind: "cabin", x: 425.1, y: 416.2, width: 36, height: 26 },
  { id: "cabin-32", name: "Cabin 32", kind: "cabin", x: 459.6, y: 415.4, width: 37, height: 24 },
  { id: "the-hilton", name: "The Hilton", kind: "cabin", x: 143.5, y: 335.0, width: 25, height: 22 },
  { id: "the-hyatt", name: "The Hyatt", kind: "cabin", x: 151.6, y: 318.9, width: 24, height: 23 },
  { id: "the-beehive", name: "The Beehive", kind: "cabin", x: 140.3, y: 351.6, width: 24, height: 21 },
];

export function findCampCabinSlotById(id: CampCabinSlotId | null) {
  if (!id) return null;
  return CAMP_MAP_CABINS.find((slot) => slot.id === id) ?? null;
}

type CampCabinShapeState =
  | "hidden"
  | "placed"
  | "assigned"
  | "selected"
  | "unavailable";

export function CampCabinShape({
  slot,
  className = "",
  state = "hidden",
}: {
  slot: CampMapCabinFeature;
  className?: string;
  state?: CampCabinShapeState;
}) {
  const centerX = slot.x + slot.width / 2;
  const centerY = slot.y + slot.height / 2;

  const appearance = {
    hidden: {
      fill: "transparent",
      fillOpacity: 1,
      stroke: "transparent",
      strokeWidth: 1.5,
    },
    placed: {
      fill: "#ffffff",
      fillOpacity: 0.18,
      stroke: "#63726a",
      strokeWidth: 1.4,
    },
    assigned: {
      fill: "#ffffff",
      fillOpacity: 0.18,
      stroke: "var(--chakra-colors-green-600)",
      strokeWidth: 1.8,
    },
    selected: {
      fill: "#e7f3ef",
      fillOpacity: 1,
      stroke: "var(--chakra-colors-green-600)",
      strokeWidth: 2.1,
    },
    unavailable: {
      fill: "#fbfaf7",
      fillOpacity: 0.24,
      stroke: "#aaaaaa",
      strokeWidth: 1.5,
    },
  }[state];

  return (
    <g
      className={className}
      transform={slot.rotate ? `rotate(${slot.rotate} ${centerX} ${centerY})` : undefined}
    >
      <rect
        className="camp-cabin-hitbox"
        x={slot.x}
        y={slot.y}
        width={slot.width}
        height={slot.height}
        rx={7}
        fill={appearance.fill}
        fillOpacity={appearance.fillOpacity}
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export default function CampMapBase() {
  return (
    <g aria-hidden="true">
      <image

        href={campMapArtwork}
        x="0"
        y="0"
        width={CAMP_MAP_WIDTH}
        height={CAMP_MAP_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
      />
      <rect

        x="0"
        y="0"
        width={CAMP_MAP_WIDTH}
        height={CAMP_MAP_HEIGHT}
        fill="#ffffff"
        opacity={0.025}
        pointerEvents="none"
      />
    </g>
  );
}
