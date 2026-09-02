import { Router } from "express";

import {
  createQualificationSchema,
  qualificationIdParamsSchema,
  type Qualification,
} from "@appoponi/shared/schemas/qualifications";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const qualificationsRouter = Router();

qualificationsRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

qualificationsRouter.get("/", async (_req, res) => {
  try {
    const result = await query<Qualification>(`
      SELECT
        id,
        name,
        created_at,
        updated_at
      FROM qualifications
      ORDER BY name, id
    `);

    res.json({
      qualifications: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load qualifications",
    });
  }
});

qualificationsRouter.post("/", async (req, res) => {
  const parsed =
    createQualificationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid qualification",
    });
    return;
  }

  try {
    const result = await query<Qualification>(
      `
        INSERT INTO qualifications (name)
        VALUES ($1)
        RETURNING
          id,
          name,
          created_at,
          updated_at
      `,
      [parsed.data.name],
    );

    res.status(201).json({
      qualification: result.rows[0],
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Qualification already exists",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create qualification",
    });
  }
});

qualificationsRouter.delete("/:id", async (req, res) => {
  const parsed =
    qualificationIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid qualification id",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM qualifications
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Qualification does not exist",
      });
      return;
    }

    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this qualification while staff or activities use it",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete qualification",
    });
  }
});
