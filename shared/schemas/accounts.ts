import { z } from "zod";

import {
  accountTypeSchema,
  newPasswordSchema,
  type AccountType,
} from "./auth.js";

export const accountUsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) => value.toLowerCase())
  .refine(
    (value) =>
      /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(value),
    {
      message:
        "Username must use lowercase letters, numbers, periods, or hyphens only",
    },
  );

export const accountDisplayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(120);

export const createAccountSchema = z.object({
  username: accountUsernameSchema,
  display_name:
    accountDisplayNameSchema.optional(),
  password: newPasswordSchema,
  account_type: accountTypeSchema,
});

export const updateAccountSchema = z
  .object({
    username: accountUsernameSchema.optional(),
    display_name:
      accountDisplayNameSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const resetAccountPasswordSchema = z.object({
  password: newPasswordSchema,
});

export const accountIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateAccountInput =
  z.infer<typeof createAccountSchema>;

export type AccountRecord = {
  id: string;
  username: string;
  display_name: string | null;
  account_type: AccountType;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};
