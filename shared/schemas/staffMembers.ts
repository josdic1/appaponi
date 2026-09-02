import { z } from "zod";

export const staffRoleSchema = z.enum([
  "staff",
  "manager",
]);

export const createStaffMemberSchema = z.object({
  account_id: z.coerce.number().int().positive(),
  full_name: z.string().trim().min(1),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  role: staffRoleSchema,
  babysitting_eligible: z.boolean().default(false),
});

export const updateStaffMemberSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    role: staffRoleSchema.optional(),
    babysitting_eligible: z.boolean().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const staffMemberIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type StaffRole =
  z.infer<typeof staffRoleSchema>;

export type StaffMember = {
  id: string;
  account_id: string | null;
  username: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  babysitting_eligible: boolean;
  created_at: string;
  updated_at: string;
};
