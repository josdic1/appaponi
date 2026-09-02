import { Router } from "express";

import {
  activityIdParamsSchema,
  createActivitySchema,
  updateActivitySchema,
  type Activity,
} from "@appoponi/shared/schemas/activities";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const activitiesRouter = Router();

activitiesRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

activitiesRouter.get("/", async (_req, res) => {
  try {
    const result = await query<Activity>(`
      SELECT
        a.id,
        a.name,
        a.area_id,
        ar.name AS area_name,
        a.setting,
        a.created_at,
        a.updated_at
      FROM activities a
      JOIN areas ar
        ON ar.id = a.area_id
      ORDER BY a.name, a.id
    `);

    res.json({
      activities: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load activities",
    });
  }
});

activitiesRouter.post("/", async (req, res) => {
  const parsed =
    createActivitySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid activity",
    });
    return;
  }

  try {
    const result = await query<Activity>(
      `
        WITH inserted AS (
          INSERT INTO activities (
            name,
            area_id,
            setting
          )
          VALUES ($1, $2, $3)
          RETURNING *
        )
        SELECT
          i.id,
          i.name,
          i.area_id,
          ar.name AS area_name,
          i.setting,
          i.created_at,
          i.updated_at
        FROM inserted i
        JOIN areas ar
          ON ar.id = i.area_id
      `,
      [
        parsed.data.name,
        parsed.data.area_id,
        parsed.data.setting,
      ],
    );

    res.status(201).json({
      activity: result.rows[0],
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Activity already exists",
      });
      return;
    }

    if (error?.code === "23503") {
      res.status(409).json({
        error: "Area does not exist",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create activity",
    });
  }
});

activitiesRouter.patch("/:id", async (req, res) => {
  const params =
    activityIdParamsSchema.safeParse(req.params);

  const body =
    updateActivitySchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid activity update",
    });
    return;
  }

  try {
    const result = await query<Activity>(
      `
        WITH updated AS (
          UPDATE activities
          SET
            name = COALESCE($2, name),
            area_id = COALESCE($3, area_id),
            setting = COALESCE($4, setting)
          WHERE id = $1
          RETURNING *
        )
        SELECT
          u.id,
          u.name,
          u.area_id,
          ar.name AS area_name,
          u.setting,
          u.created_at,
          u.updated_at
        FROM updated u
        JOIN areas ar
          ON ar.id = u.area_id
      `,
      [
        params.data.id,
        body.data.name ?? null,
        body.data.area_id ?? null,
        body.data.setting ?? null,
      ],
    );

    const activity = result.rows[0];

    if (!activity) {
      res.status(404).json({
        error: "Activity does not exist",
      });
      return;
    }

    res.json({ activity });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Activity already exists",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not update activity",
    });
  }
});

activitiesRouter.delete("/:id", async (req, res) => {
  const parsed =
    activityIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid activity id",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM activities
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Activity does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_activity_id:
        result.rows[0].id,
    });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this activity while schedules or qualifications still use it",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete activity",
    });
  }
});
