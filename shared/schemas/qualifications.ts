import { z } from "zod";

export const createQualificationSchema = z.object({
  name: z.string().trim().min(1),
});

export const qualificationIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Qualification = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
