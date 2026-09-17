import { z } from "zod";

import {
  campCabinSlotIdSchema,
  type CampCabinSlotId,
} from "./campMap.js";

export const createCabinSchema = z.object({
  name: z.string().trim().min(1),
  area_id: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  map_slot_id: campCabinSlotIdSchema.nullable().optional(),
});

export const updateCabinSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    area_id: z.coerce
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),
    map_slot_id: campCabinSlotIdSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    {
      message:
        "At least one field is required",
    },
  );

export const cabinIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Cabin = {
  id: string;
  name: string;
  area_id: string | null;
  map_slot_id: CampCabinSlotId | null;
  created_at: string;
  updated_at: string;
};
