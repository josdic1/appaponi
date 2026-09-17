import { z } from "zod";

export const CAMP_MAP_PLACE_IDS = [
  "camp-fire",
  "field",
  "mini-ropes",
  "rec-hall",
  "barn",
  "riding",
  "tennis",
  "dining-hall",
  "arch-loons-house",
  "lower-lodge",
  "office",
  "gymnastics",
  "boat-shed",
  "waterfront",
  "your-cabin",
] as const;

export const campMapPlaceIdSchema = z.enum(
  CAMP_MAP_PLACE_IDS,
);

export type CampMapPlaceId =
  (typeof CAMP_MAP_PLACE_IDS)[number];

export const CAMP_MAP_PLACE_LABELS: Record<
  CampMapPlaceId,
  string
> = {
  "camp-fire": "Camp Fire",
  field: "Field",
  "mini-ropes": "Mini Ropes",
  "rec-hall": "Rec Hall",
  barn: "Barn",
  riding: "Riding",
  tennis: "Tennis",
  "dining-hall": "Dining Hall",
  "arch-loons-house": "Arch Loons House",
  "lower-lodge": "Lower Lodge",
  office: "Office",
  gymnastics: "Gymnastics",
  "boat-shed": "Boat Shed",
  waterfront: "Waterfront",
  "your-cabin": "Household cabin",
};

export const CAMP_CABIN_SLOT_IDS = [
  "cabin-a1",
  "cabin-a2",
  "cabin-a3",
  "cabin-a4",
  "cabin-b1",
  "cabin-b2",
  "cabin-b3",
  "cabin-b4",
  "cabin-c1",
  "cabin-c2",
  "cabin-c3",
  "cabin-c4",
  "cabin-c5",
  "cabin-c6",
  "cabin-d1",
  "cabin-d2",
  "cabin-d3",
  "cabin-d4",
] as const;

export const campCabinSlotIdSchema = z.enum(
  CAMP_CABIN_SLOT_IDS,
);

export type CampCabinSlotId =
  (typeof CAMP_CABIN_SLOT_IDS)[number];
