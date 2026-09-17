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
        display_name,
        password_hash,
        account_type,
        must_change_password
      )
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING
        id,
        username,
        display_name,
        account_type,
        must_change_password,
        created_at,
        updated_at
    `,
    [
      input.username,
      input.display_name ?? null,
      passwordHash,
      input.account_type,
    ],
  );

  return result.rows[0];
}
