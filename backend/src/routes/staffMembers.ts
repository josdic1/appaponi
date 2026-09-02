import { Router } from "express";

import {
  createStaffMemberSchema,
  staffMemberIdParamsSchema,
  updateStaffMemberSchema,
  type StaffMember,
} from "@appoponi/shared/schemas/staffMembers";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const staffMembersRouter = Router();

staffMembersRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

staffMembersRouter.get("/", async (_req, res) => {
  try {
    const result = await query<StaffMember>(
      `
        SELECT
          sm.id,
          sm.account_id,
          a.username,
          sm.full_name,
          sm.email,
          sm.phone,
          sm.role,
          sm.babysitting_eligible,
          sm.created_at,
          sm.updated_at
        FROM staff_members sm
        LEFT JOIN accounts a
          ON a.id = sm.account_id
        ORDER BY sm.full_name, sm.id
      `,
    );

    res.json({
      staff_members: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load staff members",
    });
  }
});

staffMembersRouter.post("/", async (req, res) => {
  const parsed =
    createStaffMemberSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid staff member",
    });
    return;
  }

  try {
    const result = await query<StaffMember>(
      `
        WITH inserted AS (
          INSERT INTO staff_members (
            account_id,
            full_name,
            email,
            phone,
            role,
            babysitting_eligible
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
          i.role,
          i.babysitting_eligible,
          i.created_at,
          i.updated_at
        FROM inserted i
        LEFT JOIN accounts a
          ON a.id = i.account_id
      `,
      [
        parsed.data.account_id,
        parsed.data.full_name,
        parsed.data.email ?? null,
        parsed.data.phone ?? null,
        parsed.data.role,
        parsed.data.babysitting_eligible,
      ],
    );

    res.status(201).json({
      staff_member: result.rows[0],
    });
  } catch (error: any) {
    if (
      String(error?.message ?? "").includes(
        "STAFF_ACCOUNT_REQUIRED",
      )
    ) {
      res.status(409).json({
        error:
          "Staff profiles can only use staff or admin accounts",
      });
      return;
    }

    if (error?.code === "23505") {
      res.status(409).json({
        error:
          "That account already has a staff profile",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create staff member",
    });
  }
});

staffMembersRouter.patch("/:id", async (req, res) => {
  const params =
    staffMemberIdParamsSchema.safeParse(req.params);

  const body =
    updateStaffMemberSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid staff update",
    });
    return;
  }

  try {
    const result = await query<StaffMember>(
      `
        WITH updated AS (
          UPDATE staff_members
          SET
            full_name = COALESCE($2, full_name),
            email = CASE
              WHEN $3 THEN $4
              ELSE email
            END,
            phone = CASE
              WHEN $5 THEN $6
              ELSE phone
            END,
            role = COALESCE($7, role),
            babysitting_eligible = COALESCE(
              $8,
              babysitting_eligible
            )
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
          u.role,
          u.babysitting_eligible,
          u.created_at,
          u.updated_at
        FROM updated u
        LEFT JOIN accounts a
          ON a.id = u.account_id
      `,
      [
        params.data.id,
        body.data.full_name ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "email",
        ),
        body.data.email ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "phone",
        ),
        body.data.phone ?? null,
        body.data.role ?? null,
        body.data.babysitting_eligible ?? null,
      ],
    );

    const staffMember = result.rows[0];

    if (!staffMember) {
      res.status(404).json({
        error: "Staff member does not exist",
      });
      return;
    }

    res.json({
      staff_member: staffMember,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not update staff member",
    });
  }
});

staffMembersRouter.delete("/:id", async (req, res) => {
  const parsed =
    staffMemberIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid staff member id",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM staff_members
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Staff member does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_staff_member_id:
        result.rows[0].id,
    });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this staff member while assignments still refer to them",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete staff member",
    });
  }
});
