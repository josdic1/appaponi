import { z } from "zod";

export const createStaffAreaSchema = z.object({
  staff_member_id: z.coerce.number().int().positive(),
  area_id: z.coerce.number().int().positive(),
});

export const createStaffQualificationSchema = z.object({
  staff_member_id: z.coerce.number().int().positive(),
  qualification_id: z.coerce.number().int().positive(),
});

export const createActivityQualificationSchema = z.object({
  activity_id: z.coerce.number().int().positive(),
  qualification_id: z.coerce.number().int().positive(),
  required_staff_count: z.coerce.number().int().positive().default(1),
});

export const createEventActivitySchema = z.object({
  event_id: z.coerce.number().int().positive(),
  activity_id: z.coerce.number().int().positive(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
});

export const createEventActivityStaffSchema = z.object({
  event_activity_id: z.coerce.number().int().positive(),
  staff_member_id: z.coerce.number().int().positive(),
});

export const relationshipIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type StaffArea = {
  id: string;
  staff_member_id: string;
  staff_name: string;
  area_id: string;
  area_name: string;
};

export type StaffQualification = {
  id: string;
  staff_member_id: string;
  staff_name: string;
  qualification_id: string;
  qualification_name: string;
};

export type ActivityQualification = {
  id: string;
  activity_id: string;
  activity_name: string;
  qualification_id: string;
  qualification_name: string;
  required_staff_count: number;
};

export type EventActivity = {
  id: string;
  event_id: string;
  event_name: string;
  activity_id: string;
  activity_name: string;
  area_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
};

export type EventActivityStaff = {
  id: string;
  event_activity_id: string;
  staff_member_id: string;
  staff_name: string;
};
