import { z } from "zod";

export const memberRoleSchema = z.enum([
  "primary",
  "adult",
  "child",
]);

export const createHouseholdMemberSchema = z.object({
  account_id: z.coerce.number().int().positive(),
  full_name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(1).optional(),
  dietary_restrictions: z.string().trim().min(1).optional(),
  member_role: memberRoleSchema,
});

export const updateHouseholdMemberSchema = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    dietary_restrictions: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );


export const memberHouseholdSetupSchema = z.object({
  household_name: z.string().trim().min(1),
  full_name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(1).optional(),
  dietary_restrictions: z.string().trim().min(1).optional(),
});

export const createOwnHouseholdMemberSchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  phone: z.string().trim().min(1).optional(),
  dietary_restrictions: z.string().trim().min(1).optional(),
  member_role: z.enum([
    "adult",
    "child",
  ]),
});

export const updateOwnHouseholdSchema = z.object({
  household_name: z.string().trim().min(1),
});

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
  household_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  dietary_restrictions: string | null;
  member_role: MemberRole;
  created_at: string;
  updated_at: string;
};


export type MemberHouseholdSetupInput =
  z.infer<typeof memberHouseholdSetupSchema>;

export type CreateOwnHouseholdMemberInput =
  z.infer<typeof createOwnHouseholdMemberSchema>;

export type UpdateOwnHouseholdInput =
  z.infer<typeof updateOwnHouseholdSchema>;
