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
  "cabin-1",
  "cabin-2",
  "cabin-3",
  "cabin-4",
  "cabin-5",
  "cabin-6",
  "cabin-7",
  "cabin-8",
  "cabin-9",
  "cabin-10",
  "cabin-11",
  "cabin-12",
  "cabin-13",
  "cabin-14",
  "cabin-15",
  "cabin-16",
  "cabin-17",
  "cabin-18",
  "cabin-19",
  "cabin-20",
  "cabin-21",
  "cabin-22",
  "cabin-23",
  "cabin-24",
  "cabin-25",
  "cabin-26",
  "cabin-27",
  "cabin-28",
  "cabin-29",
  "cabin-30",
  "cabin-31",
  "cabin-32",
  "the-hilton",
  "the-hyatt",
  "the-beehive",
] as const;

export const campCabinSlotIdSchema = z.enum(
  CAMP_CABIN_SLOT_IDS,
);

export type CampCabinSlotId =
  (typeof CAMP_CABIN_SLOT_IDS)[number];
