import { z } from "zod";

export const foodTagValues = [
  "SNACK",
  "BEVERAGE",
  "ENTREE",
  "SIDE",
  "DESSERT",
  "APPETIZER",
  "SALAD",
  "SOUP",
  "BAKERY",
  "FRUIT",
  "CONDIMENT",
  "VEGETARIAN",
  "VEGAN",
  "GLUTEN_FREE",
  "DAIRY_FREE",
] as const;

export const foodTagSchema = z.enum(foodTagValues);

export type FoodTag = z.infer<typeof foodTagSchema>;

const nullableMealTypeId = z.coerce
  .number()
  .int()
  .positive()
  .nullable()
  .optional();

const nullableDayOfWeek = z.coerce
  .number()
  .int()
  .min(0)
  .max(6)
  .nullable()
  .optional();

export const createMealItemSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  dietary_notes: z.string().trim().min(1).optional(),
  tags: z.array(foodTagSchema).max(foodTagValues.length).default([]),
});

export const mealItemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateMealItemSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).nullable().optional(),
  dietary_notes: z.string().trim().min(1).nullable().optional(),
  tags: z.array(foodTagSchema).max(foodTagValues.length).optional(),
});

export const createMealMenuSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
});

export const createMealMenuItemSchema = z.object({
  menu_id: z.coerce.number().int().positive(),
  item_id: z.coerce.number().int().positive(),
  meal_type_id: nullableMealTypeId,
  day_of_week: nullableDayOfWeek,
  sort_order: z.coerce.number().int().default(0),
});

export const createEventMealSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  meal_type_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
});

export const mealMenuIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const applyMealMenuSchema = z.object({
  event_id: z.coerce.number().int().positive(),
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
  item_id: z.coerce.number().int().positive().optional(),
  meal_type_id: nullableMealTypeId,
  day_of_week: nullableDayOfWeek,
  sort_order: z.coerce.number().int().optional(),
});

export const eventMealIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createEventMealItemSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  sort_order: z.coerce.number().int().optional(),
});

export const eventMealItemIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateEventMealItemSchema = z.object({
  sort_order: z.coerce.number().int(),
});

export const updateEventMealSchema = z.object({
  event_id: z.coerce.number().int().positive().optional(),
  meal_type_id: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});

export type MealType = {
  id: string;
  name: string;
};

export type MealItem = {
  id: string;
  name: string;
  description: string | null;
  dietary_notes: string | null;
  tags: FoodTag[];
  menu_use_count: number;
};

export type MealMenu = {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
  day_count: number;
};

export type MealMenuItem = {
  id: string;
  menu_id: string;
  item_id: string;
  meal_type_id: string | null;
  meal_type_name: string | null;
  day_of_week: number | null;
  name: string;
  description: string | null;
  dietary_notes: string | null;
  sort_order: number;
};

export type MealServiceItem = {
  id: string;
  item_id: string;
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
  composition_mode: "DEFAULT_MENU" | "CUSTOM";
  items: MealServiceItem[];
};
