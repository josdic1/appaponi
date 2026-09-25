import { Router } from "express";

import {
  cabinIdParamsSchema,
  createCabinSchema,
  updateCabinSchema,
  type Cabin,
} from "@appoponi/shared/schemas/cabins";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const cabinsRouter = Router();

cabinsRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

cabinsRouter.get("/", async (_req, res) => {
  try {
    const result = await query<Cabin>(`
      SELECT
        id,
        name,
        area_id,
        map_slot_id,
        created_at,
        updated_at
      FROM cabins
      ORDER BY
        CASE
          WHEN name ~ '^Cabin [0-9]+$' THEN 0
          ELSE 1
        END,
        CASE
          WHEN name ~ '^Cabin [0-9]+$'
            THEN substring(name FROM '[0-9]+')::INTEGER
          ELSE NULL
        END,
        name,
        id
    `);

    res.json({
      cabins: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load cabins",
    });
  }
});

cabinsRouter.post("/", async (req, res) => {
  const parsed =
    createCabinSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid cabin",
    });
    return;
  }

  try {
    const result = await query<Cabin>(
      `
        INSERT INTO cabins (
          name,
          area_id,
          map_slot_id
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          name,
          area_id,
          map_slot_id,
          created_at,
          updated_at
      `,
      [
        parsed.data.name,
        parsed.data.area_id ?? null,
        parsed.data.map_slot_id ?? null,
      ],
    );

    res.status(201).json({
      cabin: result.rows[0],
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error:
          error?.constraint ===
          "cabins_map_slot_unique"
            ? "That map cabin is already in use"
            : "Cabin already exists",
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
      error: "Could not create cabin",
    });
  }
});

cabinsRouter.patch("/:id", async (req, res) => {
  const params =
    cabinIdParamsSchema.safeParse(req.params);

  const body =
    updateCabinSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid cabin update",
    });
    return;
  }

  try {
    const result = await query<Cabin>(
      `
        UPDATE cabins
        SET
          name = COALESCE($2, name),
          area_id = CASE
            WHEN $3 THEN $4
            ELSE area_id
          END,
          map_slot_id = CASE
            WHEN $5 THEN $6
            ELSE map_slot_id
          END
        WHERE id = $1
        RETURNING
          id,
          name,
          area_id,
          map_slot_id,
          created_at,
          updated_at
      `,
      [
        params.data.id,
        body.data.name ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "area_id",
        ),
        body.data.area_id ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "map_slot_id",
        ),
        body.data.map_slot_id ?? null,
      ],
    );

    const cabin = result.rows[0];

    if (!cabin) {
      res.status(404).json({
        error: "Cabin does not exist",
      });
      return;
    }

    res.json({ cabin });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error:
          error?.constraint ===
          "cabins_map_slot_unique"
            ? "That map cabin is already in use"
            : "Cabin already exists",
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
      error: "Could not update cabin",
    });
  }
});

cabinsRouter.delete("/:id", async (req, res) => {
  const parsed =
    cabinIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid cabin id",
    });
    return;
  }

  try {
    const result = await query<{
      id: string;
    }>(
      `
        DELETE FROM cabins
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Cabin does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_cabin_id:
        result.rows[0].id,
    });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this cabin while a registration uses it",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete cabin",
    });
  }
});
