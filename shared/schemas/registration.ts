import { z } from "zod";

export const createEventRegistrationSchema = z.object({
  account_id: z.coerce.number().int().positive(),
  event_id: z.coerce.number().int().positive(),
  spots_paid_for: z.coerce.number().int().positive(),
});

export const updateEventRegistrationSchema = z.object({
  spots_paid_for: z.coerce.number().int().positive(),
});

export const registrationIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const assignRegistrationCabinSchema = z.object({
  cabin_id: z.coerce
    .number()
    .int()
    .positive()
    .nullable(),
});

export const createMemberAttendeeSchema = z.object({
  member_id: z.coerce.number().int().positive(),
  event_id: z.coerce.number().int().positive(),
});

export const memberAttendeeIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createActivitySignupSchema = z.object({
  event_activity_id: z.coerce.number().int().positive(),
  member_attendee_id: z.coerce.number().int().positive(),
});

export const activitySignupIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type EventRegistration = {
  id: string;
  account_id: string;
  username: string;
  event_id: string;
  event_name: string;
  spots_paid_for: number;
  selected_attendees: number;
  cabin_id: string | null;
  cabin_name: string | null;
  cabin_map_x: number | null;
  cabin_map_y: number | null;
  share_cabin_publicly: boolean;
};

export type MemberAttendee = {
  id: string;
  member_id: string;
  full_name: string;
  member_role: "primary" | "adult" | "child";
  event_id: string;
  event_name: string;
};

export type ActivitySignup = {
  id: string;
  event_activity_id: string;
  member_attendee_id: string;
  member_id: string;
  member_name: string;
  activity_name: string;
  event_name: string;
  starts_at: string;
  ends_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
};
