import { z } from "zod";

export const foodOfferingTypeSchema = z.enum(["SNACK", "AFTER_HOURS"]);
export type FoodOfferingType = z.infer<typeof foodOfferingTypeSchema>;

export const createFoodOfferingSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  item_id: z.coerce.number().int().positive(),
  offering_type: foodOfferingTypeSchema,
  sort_order: z.coerce.number().int().optional(),
});

export const foodOfferingIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateFoodOfferingSchema = z.object({
  available: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export const createFoodOrderSchema = z.object({
  event_registration_id: z.coerce.number().int().positive(),
  requested_by_member_id: z.coerce.number().int().positive().nullable().optional(),
  offering_type: foodOfferingTypeSchema,
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

export const updateFoodOrderSchema = z.object({
  assigned_staff_member_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["open", "fulfilled", "cancelled"]).optional(),
});

export const foodOrderIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type FoodOffering = {
  id: string;
  event_id: string;
  item_id: string;
  offering_type: FoodOfferingType;
  name: string;
  description: string | null;
  dietary_notes: string | null;
  available: boolean;
  sort_order: number;
};

export type FoodOrderItem = {
  item_id: string;
  item_name: string;
  quantity: number;
};

export type FoodOrder = {
  id: string;
  event_registration_id: string;
  event_id: string;
  event_name: string;
  offering_type: FoodOfferingType;
  username: string;
  requested_by_member_id: string | null;
  requested_by_name: string | null;
  assigned_staff_member_id: string | null;
  assigned_staff_name: string | null;
  fulfillment: "pickup" | "delivery";
  delivery_location: string | null;
  status: "open" | "fulfilled" | "cancelled";
  notes: string | null;
  items: FoodOrderItem[];
  created_at: string;
};
