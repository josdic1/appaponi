import type {
  AccountRecord,
  CreateAccountInput,
} from "@appoponi/shared/schemas/accounts";

import { query } from "../db/db.js";
import { hashPassword } from "./auth.js";

export async function createAccount(
  input: CreateAccountInput,
): Promise<AccountRecord> {
  const passwordHash =
    await hashPassword(input.password);

  const result = await query<AccountRecord>(
    `
      INSERT INTO accounts (
        username,
        password_hash,
        account_type,
        must_change_password
      )
      VALUES ($1, $2, $3, TRUE)
      RETURNING
        id,
        username,
        account_type,
        must_change_password,
        created_at,
        updated_at
    `,
    [
      input.username,
      passwordHash,
      input.account_type,
    ],
  );

  return result.rows[0];
}
