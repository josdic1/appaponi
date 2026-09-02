import { z } from "zod";

export const createBabysittingRequestSchema = z.object({
  event_registration_id: z.coerce.number().int().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  notes: z.string().trim().min(1).optional(),
  member_ids: z.array(
    z.coerce.number().int().positive(),
  ).min(1),
});

export const updateBabysittingRequestSchema = z.object({
  sitter_staff_member_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum([
    "pending",
    "confirmed",
    "completed",
    "cancelled",
  ]).optional(),
});

export const babysittingRequestIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type BabysittingRequest = {
  id: string;
  event_registration_id: string;
  event_name: string;
  username: string;
  sitter_staff_member_id: string | null;
  sitter_name: string | null;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  member_names: string[];
};
