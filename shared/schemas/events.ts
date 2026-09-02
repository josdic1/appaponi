import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().trim().min(1),
  event_type_id: z.coerce.number().int().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  other_value: z.string().trim().min(1).optional(),
  other_reason: z.string().trim().min(1).optional(),
});

export const updateEventSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    event_type_id: z.coerce.number().int().positive().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
    other_value: z.string().trim().min(1).optional(),
    other_reason: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const eventIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type EventType = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type EventRecord = {
  id: string;
  name: string;
  event_type_id: string;
  event_type_name: string;
  starts_at: string;
  ends_at: string;
  booked_at: string | null;
  other_value: string | null;
  other_reason: string | null;
  created_at: string;
  updated_at: string;
};
