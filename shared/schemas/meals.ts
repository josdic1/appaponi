import { z } from "zod";

export const createMealMenuSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

export const createMealMenuItemSchema = z.object({
  menu_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  dietary_notes: z.string().trim().min(1).optional(),
  sort_order: z.coerce.number().int().default(0),
});

export const createEventMealSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  meal_type_id: z.coerce.number().int().positive(),
  menu_id: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
});

export const mealMenuIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateMealMenuSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).nullable().optional(),
});

export const mealMenuItemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateMealMenuItemSchema = z.object({
  menu_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).nullable().optional(),
  dietary_notes: z.string().trim().min(1).nullable().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export const eventMealIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateEventMealSchema = z.object({
  event_id: z.coerce.number().int().positive().optional(),
  meal_type_id: z.coerce.number().int().positive().optional(),
  menu_id: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});

export type MealType = {
  id: string;
  name: string;
};

export type MealMenu = {
  id: string;
  name: string;
  description: string | null;
};

export type MealMenuItem = {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  dietary_notes: string | null;
  sort_order: number;
};

export type EventMeal = {
  id: string;
  event_id: string;
  event_name: string;
  meal_type_id: string;
  meal_type_name: string;
  menu_id: string | null;
  menu_name: string | null;
  title: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
};
