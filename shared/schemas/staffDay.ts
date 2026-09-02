import { z } from "zod";

export const staffSignupIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type StaffScheduledActivity = {
  id: string;
  event_name: string;
  activity_name: string;
  area_name: string;
  starts_at: string;
  ends_at: string;
};

export type StaffParticipant = {
  signup_id: string;
  event_activity_id: string;
  member_name: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
};
