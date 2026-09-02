import { z } from "zod";

export const accountTypeSchema = z.enum([
  "member",
  "staff",
  "admin",
]);

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

export type AccountType =
  z.infer<typeof accountTypeSchema>;

export type LoginInput =
  z.infer<typeof loginSchema>;

export type ChangePasswordInput =
  z.infer<typeof changePasswordSchema>;

export type SessionAccount = {
  id: string;
  username: string;
  account_type: AccountType;
  must_change_password: boolean;
};
