import { z } from "zod";

export const activitySettingSchema = z.enum([
  "inside",
  "outside",
  "other",
]);

export const createActivitySchema = z.object({
  name: z.string().trim().min(1),
  area_id: z.coerce.number().int().positive(),
  setting: activitySettingSchema,
});

export const updateActivitySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    area_id: z.coerce.number().int().positive().optional(),
    setting: activitySettingSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const activityIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ActivitySetting =
  z.infer<typeof activitySettingSchema>;

export type Activity = {
  id: string;
  name: string;
  area_id: string;
  area_name: string;
  setting: ActivitySetting;
  created_at: string;
  updated_at: string;
};
