import { z } from "zod";

const mapCoordinateSchema =
  z.number().min(0).max(1);

export const createCabinSchema = z.object({
  name: z.string().trim().min(1),
  area_id: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
  map_x: mapCoordinateSchema.nullable().optional(),
  map_y: mapCoordinateSchema.nullable().optional(),
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
    map_x: mapCoordinateSchema.nullable().optional(),
    map_y: mapCoordinateSchema.nullable().optional(),
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
  map_x: number | null;
  map_y: number | null;
  created_at: string;
  updated_at: string;
};
