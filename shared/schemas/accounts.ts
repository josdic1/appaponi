import { z } from "zod";

import {
  accountTypeSchema,
  type AccountType,
} from "./auth.js";

export const createAccountSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  account_type: accountTypeSchema,
});

export const updateAccountSchema = z
  .object({
    username: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    { message: "At least one field is required" },
  );

export const accountIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateAccountInput =
  z.infer<typeof createAccountSchema>;

export type AccountRecord = {
  id: string;
  username: string;
  account_type: AccountType;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};
