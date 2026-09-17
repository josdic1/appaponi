import { z } from "zod";

export const createAreaSchema = z.object({
  name: z.string().trim().min(1),
});

export const updateAreaSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
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
  created_at: string;
  updated_at: string;
};
