import "dotenv/config";

import {
  createInterface,
} from "node:readline/promises";

import {
  stdin as input,
  stdout as output,
} from "node:process";

import {
  createAccountSchema,
} from "@appoponi/shared/schemas/accounts";

import {
  pool,
} from "../db/pool.js";

import {
  hashPassword,
} from "../services/auth.js";

const rl = createInterface({
  input,
  output,
});

try {
  const username = (
    await rl.question(
      "Username: ",
    )
  ).trim();

  const password =
    await rl.question(
      "Temporary password: ",
    );

  const accountType = (
    await rl.question(
      "Account type [member/staff/admin]: ",
    )
  )
    .trim()
    .toLowerCase();

  const parsed =
    createAccountSchema.safeParse({
      username,
      password,
      account_type:
        accountType,
    });

  if (!parsed.success) {
    throw new Error(
      "Invalid account details",
    );
  }

  const passwordHash =
    await hashPassword(
      parsed.data.password,
    );

  const result =
    await pool.query(
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
          must_change_password
      `,
      [
        parsed.data.username,
        passwordHash,
        parsed.data.account_type,
      ],
    );

  console.log("");
  console.log("ACCOUNT CREATED");
  console.log(result.rows[0]);
} finally {
  rl.close();
  await pool.end();
}
