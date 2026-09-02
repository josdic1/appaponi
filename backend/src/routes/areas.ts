import { Router } from "express";

import {
  areaIdParamsSchema,
  createAreaSchema,
  updateAreaSchema,
  type Area,
} from "@appoponi/shared/schemas/areas";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const areasRouter = Router();

areasRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

areasRouter.get("/", async (_req, res) => {
  try {
    const result = await query<Area>(`
      SELECT
        id,
        name,
        map_x,
        map_y,
        created_at,
        updated_at
      FROM areas
      ORDER BY name, id
    `);

    res.json({
      areas: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load areas",
    });
  }
});

areasRouter.post("/", async (req, res) => {
  const parsed =
    createAreaSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid area",
    });
    return;
  }

  try {
    const result = await query<Area>(
      `
        INSERT INTO areas (
          name,
          map_x,
          map_y
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          name,
          map_x,
          map_y,
          created_at,
          updated_at
      `,
      [
        parsed.data.name,
        parsed.data.map_x ?? null,
        parsed.data.map_y ?? null,
      ],
    );

    res.status(201).json({
      area: result.rows[0],
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Area already exists",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create area",
    });
  }
});

areasRouter.patch("/:id", async (req, res) => {
  const params =
    areaIdParamsSchema.safeParse(req.params);

  const body =
    updateAreaSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid area update",
    });
    return;
  }

  try {
    const result = await query<Area>(
      `
        UPDATE areas
        SET
          name = COALESCE($2, name),
          map_x = CASE
            WHEN $3 THEN $4
            ELSE map_x
          END,
          map_y = CASE
            WHEN $5 THEN $6
            ELSE map_y
          END
        WHERE id = $1
        RETURNING
          id,
          name,
          map_x,
          map_y,
          created_at,
          updated_at
      `,
      [
        params.data.id,
        body.data.name ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "map_x",
        ),
        body.data.map_x ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "map_y",
        ),
        body.data.map_y ?? null,
      ],
    );

    const area = result.rows[0];

    if (!area) {
      res.status(404).json({
        error: "Area does not exist",
      });
      return;
    }

    res.json({ area });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Area already exists",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not update area",
    });
  }
});

areasRouter.delete("/:id", async (req, res) => {
  const parsed =
    areaIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid area id",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM areas
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Area does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_area_id: result.rows[0].id,
    });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this area while activities, cabins, or staff assignments still use it",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete area",
    });
  }
});
