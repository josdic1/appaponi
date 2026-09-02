import { z } from "zod";

const mapCoordinateSchema =
  z.number().min(0).max(1);

export const createAreaSchema = z.object({
  name: z.string().trim().min(1),
  map_x: mapCoordinateSchema.nullable().optional(),
  map_y: mapCoordinateSchema.nullable().optional(),
});

export const updateAreaSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    map_x: mapCoordinateSchema.nullable().optional(),
    map_y: mapCoordinateSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const areaIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Area = {
  id: string;
  name: string;
  map_x: number | null;
  map_y: number | null;
  created_at: string;
  updated_at: string;
};
