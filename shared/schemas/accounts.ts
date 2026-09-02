import { z } from "zod";

import {
  accountTypeSchema,
} from "./auth.js";

export const createAccountSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(8),
  account_type: accountTypeSchema,
});

export type CreateAccountInput =
  z.infer<typeof createAccountSchema>;
