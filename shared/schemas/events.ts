import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().trim().min(1),
  event_type_id: z.coerce.number().int().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  other_value: z.string().trim().min(1).optional(),
  other_reason: z.string().trim().min(1).optional(),
});

export const cloneEventSchema = z.object({
  name: z.string().trim().min(1),
  starts_at: z.string().datetime(),
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
  meal_menu_id: string | null;
  meal_menu_name: string | null;
  created_at: string;
  updated_at: string;
};

export type EventHqRegistration = {
  id: string;
  household_name: string;
  spots_paid_for: number;
  attendee_count: number;
  cabin_name: string | null;
};

export type EventHqScheduleItem = {
  id: string;
  kind: "activity" | "meal";
  title: string;
  meta: string | null;
  starts_at: string;
  ends_at: string;
  signup_count: number | null;
  staff_names: string[];
  food_item_count: number | null;
};

export type EventHqSummary = {
  event: EventRecord;
  metrics: {
    households: number;
    people: number;
    paid_spots: number;
    cabins_assigned: number;
    activities: number;
    signups: number;
    unstaffed_activities: number;
    meals: number;
    food_services_unready: number;
    active_babysitting: number;
    pending_babysitting: number;
    open_orders: number;
    unread_notices: number;
  };
  registrations: EventHqRegistration[];
  schedule: EventHqScheduleItem[];
};
