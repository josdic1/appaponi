import { Router } from "express";

import {
  accountIdParamsSchema,
  createAccountSchema,
  updateAccountSchema,
  type AccountRecord,
} from "@appoponi/shared/schemas/accounts";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

import {
  createAccount,
} from "../services/accounts.js";

export const accountsRouter = Router();

accountsRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

accountsRouter.get("/", async (_req, res) => {
  try {
    const result = await query<AccountRecord>(
      `
        SELECT
          id,
          username,
          account_type,
          must_change_password,
          created_at,
          updated_at
        FROM accounts
        ORDER BY
          CASE account_type
            WHEN 'admin' THEN 0
            WHEN 'staff' THEN 1
            ELSE 2
          END,
          username,
          id
      `,
    );

    res.json({
      accounts: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load accounts",
    });
  }
});

accountsRouter.post("/", async (req, res) => {
  const parsed =
    createAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid account",
    });
    return;
  }

  try {
    const account =
      await createAccount(parsed.data);

    res.status(201).json({
      account,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Username already exists",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create account",
    });
  }
});

accountsRouter.patch("/:id", async (req, res) => {
  const params =
    accountIdParamsSchema.safeParse(req.params);

  const body =
    updateAccountSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid account update",
    });
    return;
  }

  try {
    const result = await query<AccountRecord>(
      `
        UPDATE accounts
        SET username = COALESCE($2, username)
        WHERE id = $1
        RETURNING
          id,
          username,
          account_type,
          must_change_password,
          created_at,
          updated_at
      `,
      [
        params.data.id,
        body.data.username ?? null,
      ],
    );

    const account = result.rows[0];

    if (!account) {
      res.status(404).json({
        error: "Account does not exist",
      });
      return;
    }

    res.json({ account });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Username already exists",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not update account",
    });
  }
});

accountsRouter.delete("/:id", async (req, res) => {
  const parsed =
    accountIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid account id",
    });
    return;
  }

  if (
    String(parsed.data.id) ===
    String(req.auth!.sub)
  ) {
    res.status(409).json({
      error:
        "Cannot delete the account you are currently using",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM accounts
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Account does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_account_id: result.rows[0].id,
    });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this account while Appoponi records still belong to it",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete account",
    });
  }
});
