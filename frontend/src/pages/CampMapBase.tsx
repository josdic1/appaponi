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

/* Stable cabin slot IDs recalibrated once to the illustrated artwork. */
export const CAMP_MAP_CABINS: CampMapCabinFeature[] = [
  { id: "cabin-a1", name: "Cabin", kind: "cabin", x: 142, y: 279, width: 30, height: 30, rotate: -8 },
  { id: "cabin-a2", name: "Cabin", kind: "cabin", x: 162, y: 293, width: 30, height: 30, rotate: -5 },
  { id: "cabin-a3", name: "Cabin", kind: "cabin", x: 184, y: 290, width: 30, height: 30, rotate: 4 },
  { id: "cabin-a4", name: "Cabin", kind: "cabin", x: 204, y: 293, width: 30, height: 30, rotate: 8 },
  { id: "cabin-b1", name: "Cabin", kind: "cabin", x: 224, y: 300, width: 30, height: 30, rotate: 12 },
  { id: "cabin-b2", name: "Cabin", kind: "cabin", x: 242, y: 308, width: 30, height: 30, rotate: 14 },
  { id: "cabin-b3", name: "Cabin", kind: "cabin", x: 258, y: 320, width: 30, height: 30, rotate: 18 },
  { id: "cabin-b4", name: "Cabin", kind: "cabin", x: 274, y: 332, width: 30, height: 30, rotate: 20 },
  { id: "cabin-c1", name: "Cabin", kind: "cabin", x: 286, y: 374, width: 34, height: 34, rotate: -10 },
  { id: "cabin-c2", name: "Cabin", kind: "cabin", x: 322, y: 364, width: 34, height: 34, rotate: 2 },
  { id: "cabin-c3", name: "Cabin", kind: "cabin", x: 364, y: 382, width: 34, height: 34, rotate: 11 },
  { id: "cabin-c4", name: "Cabin", kind: "cabin", x: 398, y: 363, width: 34, height: 34, rotate: -2 },
  { id: "cabin-c5", name: "Cabin", kind: "cabin", x: 431, y: 382, width: 34, height: 34, rotate: 2 },
  { id: "cabin-c6", name: "Cabin", kind: "cabin", x: 466, y: 374, width: 36, height: 36, rotate: -8 },
  { id: "cabin-d1", name: "Cabin", kind: "cabin", x: 538, y: 504, width: 34, height: 34, rotate: 11 },
  { id: "cabin-d2", name: "Cabin", kind: "cabin", x: 566, y: 531, width: 34, height: 34, rotate: 12 },
  { id: "cabin-d3", name: "Cabin", kind: "cabin", x: 588, y: 558, width: 34, height: 34, rotate: 10 },
  { id: "cabin-d4", name: "Cabin", kind: "cabin", x: 608, y: 585, width: 34, height: 34, rotate: -4 },
];

export function findCampCabinSlotById(id: CampCabinSlotId | null) {
  if (!id) return null;
  return CAMP_MAP_CABINS.find((slot) => slot.id === id) ?? null;
}

export function CampCabinShape({
  slot,
  className = "",
}: {
  slot: CampMapCabinFeature;
  className?: string;
}) {
  const centerX = slot.x + slot.width / 2;
  const centerY = slot.y + slot.height / 2;

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
        fill="transparent"
        stroke="transparent"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export default function CampMapBase() {
  return (
    <g className="member-map-base" aria-hidden="true">
      <image
        className="camp-map-artwork"
        href={campMapArtwork}
        x="0"
        y="0"
        width={CAMP_MAP_WIDTH}
        height={CAMP_MAP_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
      />
      <rect
        className="camp-map-artwork-wash"
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
