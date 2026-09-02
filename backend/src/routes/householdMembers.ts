import { Router } from "express";

import {
  createHouseholdMemberSchema,
  householdMemberIdParamsSchema,
  transferPrimarySchema,
  updateHouseholdMemberSchema,
  type HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import { pool } from "../db/pool.js";
import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const householdMembersRouter = Router();

householdMembersRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

householdMembersRouter.get("/", async (req, res) => {
  const accountId =
    typeof req.query.account_id === "string"
      ? Number(req.query.account_id)
      : null;

  if (
    accountId !== null &&
    (!Number.isInteger(accountId) || accountId <= 0)
  ) {
    res.status(400).json({
      error: "Invalid account id",
    });
    return;
  }

  try {
    const result = await query<HouseholdMember>(
      `
        SELECT
          hm.id,
          hm.account_id,
          a.username,
          hm.full_name,
          hm.email,
          hm.phone,
          hm.dietary_restrictions,
          hm.member_role,
          hm.created_at,
          hm.updated_at
        FROM household_members hm
        JOIN accounts a
          ON a.id = hm.account_id
        WHERE ($1::bigint IS NULL OR hm.account_id = $1)
        ORDER BY
          a.username,
          CASE hm.member_role
            WHEN 'primary' THEN 0
            WHEN 'adult' THEN 1
            ELSE 2
          END,
          hm.full_name,
          hm.id
      `,
      [accountId],
    );

    res.json({
      household_members: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load household members",
    });
  }
});

householdMembersRouter.post("/", async (req, res) => {
  const parsed =
    createHouseholdMemberSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid household member",
    });
    return;
  }

  try {
    const result = await query<HouseholdMember>(
      `
        WITH inserted AS (
          INSERT INTO household_members (
            account_id,
            full_name,
            email,
            phone,
            dietary_restrictions,
            member_role
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        )
        SELECT
          i.id,
          i.account_id,
          a.username,
          i.full_name,
          i.email,
          i.phone,
          i.dietary_restrictions,
          i.member_role,
          i.created_at,
          i.updated_at
        FROM inserted i
        JOIN accounts a
          ON a.id = i.account_id
      `,
      [
        parsed.data.account_id,
        parsed.data.full_name,
        parsed.data.email ?? null,
        parsed.data.phone ?? null,
        parsed.data.dietary_restrictions ?? null,
        parsed.data.member_role,
      ],
    );

    res.status(201).json({
      household_member: result.rows[0],
    });
  } catch (error: any) {
    if (
      String(error?.message ?? "").includes(
        "HOUSEHOLD_PRIMARY_REQUIRED",
      )
    ) {
      res.status(409).json({
        error:
          "The first household profile must be Primary, and each household must keep exactly one Primary",
      });
      return;
    }

    if (
      String(error?.message ?? "").includes(
        "MEMBER_ACCOUNT_REQUIRED",
      )
    ) {
      res.status(409).json({
        error:
          "Household profiles can only belong to member accounts",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create household member",
    });
  }
});

householdMembersRouter.patch("/:id", async (req, res) => {
  const params =
    householdMemberIdParamsSchema.safeParse(req.params);

  const body =
    updateHouseholdMemberSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid household member update",
    });
    return;
  }

  try {
    const result = await query<HouseholdMember>(
      `
        WITH updated AS (
          UPDATE household_members
          SET
            full_name = COALESCE($2, full_name),
            email = CASE WHEN $3 THEN $4 ELSE email END,
            phone = CASE WHEN $5 THEN $6 ELSE phone END,
            dietary_restrictions =
              CASE WHEN $7 THEN $8 ELSE dietary_restrictions END
          WHERE id = $1
          RETURNING *
        )
        SELECT
          u.id,
          u.account_id,
          a.username,
          u.full_name,
          u.email,
          u.phone,
          u.dietary_restrictions,
          u.member_role,
          u.created_at,
          u.updated_at
        FROM updated u
        JOIN accounts a
          ON a.id = u.account_id
      `,
      [
        params.data.id,
        body.data.full_name ?? null,
        Object.prototype.hasOwnProperty.call(body.data, "email"),
        body.data.email ?? null,
        Object.prototype.hasOwnProperty.call(body.data, "phone"),
        body.data.phone ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "dietary_restrictions",
        ),
        body.data.dietary_restrictions ?? null,
      ],
    );

    const member = result.rows[0];

    if (!member) {
      res.status(404).json({
        error: "Household member does not exist",
      });
      return;
    }

    res.json({
      household_member: member,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not update household member",
    });
  }
});

householdMembersRouter.post(
  "/:id/transfer-primary",
  async (req, res) => {
    const params =
      householdMemberIdParamsSchema.safeParse(req.params);

    const body =
      transferPrimarySchema.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({
        error: "Invalid primary transfer",
      });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          SELECT set_config(
            'appoponi.actor_account_id',
            $1,
            true
          )
        `,
        [req.auth!.sub],
      );

      const sourceResult = await client.query<{
        id: string;
        account_id: string;
        member_role: string;
      }>(
        `
          SELECT id, account_id, member_role
          FROM household_members
          WHERE id = $1
          FOR UPDATE
        `,
        [params.data.id],
      );

      const targetResult = await client.query<{
        id: string;
        account_id: string;
        member_role: string;
      }>(
        `
          SELECT id, account_id, member_role
          FROM household_members
          WHERE id = $1
          FOR UPDATE
        `,
        [body.data.target_member_id],
      );

      const source = sourceResult.rows[0];
      const target = targetResult.rows[0];

      if (!source || !target) {
        await client.query("ROLLBACK");

        res.status(404).json({
          error: "Household member does not exist",
        });
        return;
      }

      if (source.member_role !== "primary") {
        await client.query("ROLLBACK");

        res.status(409).json({
          error:
            "Only the current Primary can transfer Primary",
        });
        return;
      }

      if (
        String(source.account_id) !==
        String(target.account_id)
      ) {
        await client.query("ROLLBACK");

        res.status(409).json({
          error:
            "Primary can only transfer within the same household",
        });
        return;
      }

      if (target.member_role !== "adult") {
        await client.query("ROLLBACK");

        res.status(409).json({
          error:
            "Primary can only transfer to another Adult",
        });
        return;
      }

      await client.query(
        `
          UPDATE household_members
          SET member_role = 'adult'
          WHERE id = $1
        `,
        [source.id],
      );

      await client.query(
        `
          UPDATE household_members
          SET member_role = 'primary'
          WHERE id = $1
        `,
        [target.id],
      );

      await client.query("COMMIT");

      res.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);

      res.status(500).json({
        error: "Could not transfer Primary",
      });
    } finally {
      client.release();
    }
  },
);

householdMembersRouter.delete("/:id", async (req, res) => {
  const parsed =
    householdMemberIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid household member id",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM household_members
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Household member does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_household_member_id:
        result.rows[0].id,
    });
  } catch (error: any) {
    if (
      String(error?.message ?? "").includes(
        "HOUSEHOLD_PRIMARY_REQUIRED",
      )
    ) {
      res.status(409).json({
        error:
          "A populated household must keep exactly one Primary",
      });
      return;
    }

    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this person while Appoponi records still refer to them",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete household member",
    });
  }
});
