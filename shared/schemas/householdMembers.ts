import { z } from "zod";

export const memberRoleSchema = z.enum([
  "primary",
  "adult",
  "child",
]);

export const createHouseholdMemberSchema = z.object({
  account_id: z.coerce.number().int().positive(),
  full_name: z.string().trim().min(1),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  dietary_restrictions: z.string().trim().min(1).optional(),
  member_role: memberRoleSchema,
});

export const updateHouseholdMemberSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    dietary_restrictions: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const householdMemberIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const transferPrimarySchema = z.object({
  target_member_id: z.coerce.number().int().positive(),
});

export type MemberRole = z.infer<typeof memberRoleSchema>;

export type HouseholdMember = {
  id: string;
  account_id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dietary_restrictions: string | null;
  member_role: MemberRole;
  created_at: string;
  updated_at: string;
};
