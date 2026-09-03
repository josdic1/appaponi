import { z } from "zod";

export const createAfterHoursItemSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

export const afterHoursItemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateAfterHoursItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).nullable().optional(),
  available: z.boolean().optional(),
});

export const createAfterHoursOrderSchema = z.object({
  event_registration_id: z.coerce.number().int().positive(),
  requested_by_member_id: z.coerce.number().int().positive().nullable().optional(),
  fulfillment: z.enum(["pickup", "delivery"]),
  delivery_location: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  items: z.array(
    z.object({
      item_id: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive(),
    }),
  ).min(1),
});

export const updateAfterHoursOrderSchema = z.object({
  assigned_staff_member_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["open", "fulfilled", "cancelled"]).optional(),
});

export const afterHoursOrderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AfterHoursItem = {
  id: string;
  name: string;
  description: string | null;
  available: boolean;
};

export type AfterHoursOrder = {
  id: string;
  event_registration_id: string;
  event_name: string;
  username: string;
  requested_by_member_id: string | null;
  requested_by_name: string | null;
  assigned_staff_member_id: string | null;
  assigned_staff_name: string | null;
  fulfillment: "pickup" | "delivery";
  delivery_location: string | null;
  status: "open" | "fulfilled" | "cancelled";
  notes: string | null;
  created_at: string;
};
