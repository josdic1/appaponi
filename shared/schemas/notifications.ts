import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  activity_reminders: z.boolean().optional(),
  meal_reminders: z.boolean().optional(),
  special_notifications: z.boolean().optional(),
  general_notifications: z.boolean().optional(),
});

export const createNotificationSchema = z.object({
  account_id: z.coerce.number().int().positive(),
  event_id: z.coerce.number().int().positive().nullable().optional(),
  kind: z.enum([
    "activity",
    "meal",
    "special",
    "general",
  ]),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  scheduled_for: z.string().datetime().nullable().optional(),
});

export type NotificationPreferences = {
  account_id: string;
  activity_reminders: boolean;
  meal_reminders: boolean;
  special_notifications: boolean;
  general_notifications: boolean;
};

export type NotificationRecord = {
  id: string;
  account_id: string;
  event_id: string | null;
  kind: "activity" | "meal" | "special" | "general";
  title: string;
  body: string;
  scheduled_for: string | null;
  read_at: string | null;
  created_at: string;
};
