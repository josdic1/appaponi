import { Router } from "express";
import type { PoolClient } from "pg";

import {
  applyMealMenuSchema,
  createEventMealSchema,
  createEventMealItemSchema,
  createMealItemSchema,
  createMealMenuItemSchema,
  createMealMenuSchema,
  eventMealIdParamsSchema,
  eventMealItemIdParamsSchema,
  mealItemIdParamsSchema,
  mealMenuIdParamsSchema,
  mealMenuItemIdParamsSchema,
  updateEventMealSchema,
  updateEventMealItemSchema,
  updateMealItemSchema,
  updateMealMenuItemSchema,
  updateMealMenuSchema,
  type EventMeal,
  type FoodTag,
  type MealItem,
  type MealMenu,
  type MealMenuItem,
  type MealType,
} from "@appoponi/shared/schemas/meals";

import { query } from "../db/db.js";
import { pool } from "../db/pool.js";

import {
  findMenuPreset,
  menuPresets,
} from "../demo/menuPresets.js";
import {
  seedMenu,
} from "../services/menuSeeds.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const mealsRouter = Router();

mealsRouter.use(
  requireAuth,
  requirePasswordChanged,
);

async function ensureCustomComposition(
  client: PoolClient,
  eventMealId: number,
) {
  const service = await client.query<{ composition_mode: "DEFAULT_MENU" | "CUSTOM" }>(
    `
      SELECT composition_mode
      FROM event_meals
      WHERE id = $1
      FOR UPDATE
    `,
    [eventMealId],
  );

  const current = service.rows[0];
  if (!current) return false;
  if (current.composition_mode === "CUSTOM") return true;

  await client.query(
    `
      INSERT INTO event_meal_items (
        event_meal_id,
        item_id,
        sort_order
      )
      SELECT
        em.id,
        mmi.item_id,
        mmi.sort_order
      FROM event_meals em
      JOIN events e
        ON e.id = em.event_id
      JOIN meal_menu_items mmi
        ON mmi.menu_id = e.meal_menu_id
      WHERE em.id = $1
        AND (
          mmi.day_of_week IS NULL
          OR mmi.day_of_week = EXTRACT(
            DOW FROM em.starts_at AT TIME ZONE 'America/New_York'
          )::int
        )
        AND (
          mmi.meal_type_id IS NULL
          OR mmi.meal_type_id = em.meal_type_id
        )
      ON CONFLICT (event_meal_id, item_id) DO NOTHING
    `,
    [eventMealId],
  );

  await client.query(
    `
      UPDATE event_meals
      SET composition_mode = 'CUSTOM'
      WHERE id = $1
    `,
    [eventMealId],
  );

  return true;
}

async function replaceMealItemTags(
  client: PoolClient,
  itemId: number,
  tags: readonly FoodTag[],
) {
  await client.query(
    `
      DELETE FROM meal_item_tags
      WHERE item_id = $1
    `,
    [itemId],
  );

  for (const tag of new Set(tags)) {
    await client.query(
      `
        INSERT INTO meal_item_tags (
          item_id,
          tag
        )
        VALUES ($1, $2)
      `,
      [itemId, tag],
    );
  }
}

async function selectMealItem(
  client: PoolClient,
  itemId: number,
) {
  const result = await client.query<MealItem>(
    `
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.dietary_notes,
        COALESCE(
          (
            SELECT ARRAY_AGG(mit.tag ORDER BY mit.tag)
            FROM meal_item_tags mit
            WHERE mit.item_id = mi.id
          ),
          ARRAY[]::text[]
        ) AS tags,
        (
          SELECT COUNT(DISTINCT mmi.menu_id)::int
          FROM meal_menu_items mmi
          WHERE mmi.item_id = mi.id
        ) AS menu_use_count
      FROM meal_items mi
      WHERE mi.id = $1
    `,
    [itemId],
  );

  return result.rows[0] ?? null;
}

mealsRouter.get("/types", async (_req, res) => {
  const result = await query<MealType>(`
    SELECT id, name
    FROM meal_types
    ORDER BY id
  `);

  res.json({
    meal_types: result.rows,
  });
});

mealsRouter.get(
  "/items",
  requireAccountType("admin"),
  async (_req, res) => {
  const result = await query<MealItem>(`
    SELECT
      mi.id,
      mi.name,
      mi.description,
      mi.dietary_notes,
      COALESCE(
        (
          SELECT ARRAY_AGG(mit.tag ORDER BY mit.tag)
          FROM meal_item_tags mit
          WHERE mit.item_id = mi.id
        ),
        ARRAY[]::text[]
      ) AS tags,
      (
        SELECT COUNT(DISTINCT mmi.menu_id)::int
        FROM meal_menu_items mmi
        WHERE mmi.item_id = mi.id
      ) AS menu_use_count
    FROM meal_items mi
    ORDER BY LOWER(mi.name), mi.id
  `);

  res.json({
    items: result.rows,
  });
  },
);

mealsRouter.post(
  "/items",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed = createMealItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid menu item",
      });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const inserted = await client.query<{ id: string }>(
        `
          INSERT INTO meal_items (
            name,
            description,
            dietary_notes
          )
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [
          parsed.data.name,
          parsed.data.description ?? null,
          parsed.data.dietary_notes ?? null,
        ],
      );

      const itemId = Number(inserted.rows[0].id);

      await replaceMealItemTags(
        client,
        itemId,
        parsed.data.tags,
      );

      const item = await selectMealItem(
        client,
        itemId,
      );

      await client.query("COMMIT");

      res.status(201).json({
        item,
      });
    } catch (error: any) {
      await client.query("ROLLBACK");

      if (error?.code === "23505") {
        res.status(409).json({
          error: "That menu item already exists",
        });
        return;
      }

      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.patch(
  "/items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = mealItemIdParamsSchema.safeParse(req.params);
    const body = updateMealItemSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({
        error: "Invalid menu item update",
      });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ id: string }>(
        `
          UPDATE meal_items
          SET
            name = COALESCE($2, name),
            description =
              CASE WHEN $3 THEN $4 ELSE description END,
            dietary_notes =
              CASE WHEN $5 THEN $6 ELSE dietary_notes END
          WHERE id = $1
          RETURNING id
        `,
        [
          params.data.id,
          body.data.name ?? null,
          Object.prototype.hasOwnProperty.call(body.data, "description"),
          body.data.description ?? null,
          Object.prototype.hasOwnProperty.call(body.data, "dietary_notes"),
          body.data.dietary_notes ?? null,
        ],
      );

      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Menu item does not exist" });
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body.data,
          "tags",
        )
      ) {
        await replaceMealItemTags(
          client,
          params.data.id,
          body.data.tags ?? [],
        );
      }

      const item = await selectMealItem(
        client,
        params.data.id,
      );

      await client.query("COMMIT");

      res.json({ item });
    } catch (error: any) {
      await client.query("ROLLBACK");

      if (error?.code === "23505") {
        res.status(409).json({
          error: "That menu item already exists",
        });
        return;
      }

      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.delete(
  "/items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = mealItemIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: "Invalid menu item id" });
      return;
    }

    try {
      const result = await query<{ id: string }>(
        `DELETE FROM meal_items WHERE id = $1 RETURNING id`,
        [params.data.id],
      );

      if (!result.rows[0]) {
        res.status(404).json({ error: "Menu item does not exist" });
        return;
      }

      res.json({
        ok: true,
        deleted_item_id: result.rows[0].id,
      });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error: "This item is still used by a saved menu",
        });
        return;
      }

      throw error;
    }
  },
);

mealsRouter.get(
  "/presets",
  requireAccountType("admin"),
  async (_req, res) => {
    res.json({
      presets: menuPresets.map((preset) => ({
        key: preset.key,
        name: preset.name,
        description: preset.description ?? null,
        item_count: preset.items.length,
      })),
    });
  },
);

mealsRouter.post(
  "/presets/:key",
  requireAccountType("admin"),
  async (req, res) => {
    const preset = findMenuPreset(String(req.params.key));

    if (!preset) {
      res.status(404).json({
        error: "Unknown menu starter",
      });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const menuId = await seedMenu(client, preset);
      await client.query("COMMIT");

      res.json({
        key: preset.key,
        menu_id: menuId,
        item_count: preset.items.length,
        message: `${preset.name} is ready in the menu library.`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.get("/menus", async (_req, res) => {
  const result = await query<MealMenu>(`
    SELECT
      mm.id,
      mm.name,
      mm.description,
      COUNT(mmi.id)::int AS item_count,
      COUNT(DISTINCT mmi.day_of_week) FILTER (
        WHERE mmi.day_of_week IS NOT NULL
      )::int AS day_count
    FROM meal_menus mm
    LEFT JOIN meal_menu_items mmi
      ON mmi.menu_id = mm.id
    GROUP BY mm.id, mm.name, mm.description
    ORDER BY LOWER(mm.name), mm.id
  `);

  res.json({
    menus: result.rows,
  });
});

mealsRouter.get(
  "/menu-items",
  requireAccountType("admin"),
  async (req, res) => {
  const menuId =
    typeof req.query.menu_id === "string"
      ? Number(req.query.menu_id)
      : null;

  const result = await query<MealMenuItem>(
    `
      SELECT
        mmi.id,
        mmi.menu_id,
        mmi.item_id,
        mmi.meal_type_id,
        mt.name AS meal_type_name,
        mmi.day_of_week,
        mi.name,
        mi.description,
        mi.dietary_notes,
        mmi.sort_order
      FROM meal_menu_items mmi
      JOIN meal_items mi
        ON mi.id = mmi.item_id
      LEFT JOIN meal_types mt
        ON mt.id = mmi.meal_type_id
      WHERE (
        $1::bigint IS NULL
        OR mmi.menu_id = $1
      )
      ORDER BY
        mmi.menu_id,
        mmi.day_of_week NULLS FIRST,
        mmi.meal_type_id NULLS FIRST,
        mmi.sort_order,
        mmi.id
    `,
    [menuId],
  );

  res.json({
    menu_items: result.rows,
  });
  },
);

mealsRouter.get("/event-meals", async (req, res) => {
  const unrestricted =
    req.auth!.account_type === "admin" ||
    req.auth!.account_type === "staff";

  const eventId =
    typeof req.query.event_id === "string" && req.query.event_id
      ? Number(req.query.event_id)
      : null;

  if (
    eventId !== null &&
    (!Number.isInteger(eventId) || eventId <= 0)
  ) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const result = await query<EventMeal>(
    `
      SELECT
        em.id,
        em.event_id,
        e.name AS event_name,
        em.meal_type_id,
        mt.name AS meal_type_name,
        e.meal_menu_id AS menu_id,
        mm.name AS menu_name,
        em.title,
        em.notes,
        em.starts_at,
        em.ends_at,
        em.composition_mode,
        COALESCE(
          CASE
            WHEN em.composition_mode = 'CUSTOM' THEN (
              SELECT json_agg(
                json_build_object(
                  'id', custom.id::text,
                  'item_id', mi.id::text,
                  'name', mi.name,
                  'description', mi.description,
                  'dietary_notes', mi.dietary_notes,
                  'sort_order', custom.sort_order
                )
                ORDER BY custom.sort_order, custom.id
              )
              FROM event_meal_items custom
              JOIN meal_items mi
                ON mi.id = custom.item_id
              WHERE custom.event_meal_id = em.id
            )
            ELSE (
              SELECT json_agg(
                json_build_object(
                  'id', mmi.id::text,
                  'item_id', mi.id::text,
                  'name', mi.name,
                  'description', mi.description,
                  'dietary_notes', mi.dietary_notes,
                  'sort_order', mmi.sort_order
                )
                ORDER BY mmi.sort_order, mmi.id
              )
              FROM meal_menu_items mmi
              JOIN meal_items mi
                ON mi.id = mmi.item_id
              WHERE mmi.menu_id = e.meal_menu_id
                AND (
                  mmi.day_of_week IS NULL
                  OR mmi.day_of_week = EXTRACT(
                    DOW FROM em.starts_at AT TIME ZONE 'America/New_York'
                  )::int
                )
                AND (
                  mmi.meal_type_id IS NULL
                  OR mmi.meal_type_id = em.meal_type_id
                )
            )
          END,
          '[]'::json
        ) AS items
      FROM event_meals em
      JOIN events e
        ON e.id = em.event_id
      JOIN meal_types mt
        ON mt.id = em.meal_type_id
      LEFT JOIN meal_menus mm
        ON mm.id = e.meal_menu_id
      WHERE (
        $1::boolean = TRUE
        OR EXISTS (
          SELECT 1
          FROM event_registrations er
          WHERE er.event_id = em.event_id
            AND er.account_id = $2
        )
      )
        AND (
          $3::bigint IS NULL
          OR em.event_id = $3
        )
      ORDER BY em.starts_at, em.id
    `,
    [
      unrestricted,
      req.auth!.sub,
      eventId,
    ],
  );

  res.json({
    event_meals: result.rows,
  });
});

mealsRouter.post(
  "/event-meals/:id/items",
  requireAccountType("admin"),
  async (req, res) => {
    const params = eventMealIdParamsSchema.safeParse(req.params);
    const body = createEventMealItemSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid service food item" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const serviceExists = await ensureCustomComposition(
        client,
        params.data.id,
      );

      if (!serviceExists) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Food service does not exist" });
        return;
      }

      const sortOrder = body.data.sort_order ?? (
        await client.query<{ next_sort: number }>(
          `
            SELECT COALESCE(MAX(sort_order), 0)::int + 10 AS next_sort
            FROM event_meal_items
            WHERE event_meal_id = $1
          `,
          [params.data.id],
        )
      ).rows[0].next_sort;

      await client.query(
        `
          INSERT INTO event_meal_items (
            event_meal_id,
            item_id,
            sort_order
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (event_meal_id, item_id) DO NOTHING
        `,
        [params.data.id, body.data.item_id, sortOrder],
      );

      await client.query("COMMIT");
      res.status(201).json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.delete(
  "/event-meals/:id/items/:itemId",
  requireAccountType("admin"),
  async (req, res) => {
    const eventMealId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(eventMealId) || eventMealId <= 0 || !Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ error: "Invalid service or food item id" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const serviceExists = await ensureCustomComposition(client, eventMealId);
      if (!serviceExists) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Food service does not exist" });
        return;
      }

      await client.query(
        `DELETE FROM event_meal_items WHERE event_meal_id = $1 AND item_id = $2`,
        [eventMealId, itemId],
      );
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.patch(
  "/event-meals/:id/items/:itemId",
  requireAccountType("admin"),
  async (req, res) => {
    const eventMealId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const body = updateEventMealItemSchema.safeParse(req.body);

    if (!Number.isInteger(eventMealId) || eventMealId <= 0 || !Number.isInteger(itemId) || itemId <= 0 || !body.success) {
      res.status(400).json({ error: "Invalid service food update" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const serviceExists = await ensureCustomComposition(client, eventMealId);
      if (!serviceExists) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Food service does not exist" });
        return;
      }

      const result = await client.query<{ id: string }>(
        `
          UPDATE event_meal_items
          SET sort_order = $3
          WHERE event_meal_id = $1
            AND item_id = $2
          RETURNING id
        `,
        [eventMealId, itemId, body.data.sort_order],
      );

      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Food item is not in this service" });
        return;
      }

      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.patch(
  "/event-meal-items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = eventMealItemIdParamsSchema.safeParse(req.params);
    const body = updateEventMealItemSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid service food update" });
      return;
    }

    const result = await query<{ id: string }>(
      `
        UPDATE event_meal_items
        SET sort_order = $2
        WHERE id = $1
        RETURNING id
      `,
      [params.data.id, body.data.sort_order],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Service food item does not exist" });
      return;
    }

    res.json({ ok: true });
  },
);

mealsRouter.delete(
  "/event-meal-items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = eventMealItemIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: "Invalid service food item id" });
      return;
    }

    const result = await query<{ id: string }>(
      `DELETE FROM event_meal_items WHERE id = $1 RETURNING id`,
      [params.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Service food item does not exist" });
      return;
    }

    res.json({ ok: true });
  },
);

mealsRouter.delete(
  "/event-meals/:id/items",
  requireAccountType("admin"),
  async (req, res) => {
    const params = eventMealIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: "Invalid food service id" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const service = await client.query<{ id: string }>(
        `SELECT id FROM event_meals WHERE id = $1 FOR UPDATE`,
        [params.data.id],
      );

      if (!service.rows[0]) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Food service does not exist" });
        return;
      }

      await client.query(
        `DELETE FROM event_meal_items WHERE event_meal_id = $1`,
        [params.data.id],
      );

      await client.query(
        `UPDATE event_meals SET composition_mode = 'DEFAULT_MENU' WHERE id = $1`,
        [params.data.id],
      );

      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

mealsRouter.post(
  "/menus",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createMealMenuSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid menu",
      });
      return;
    }

    try {
      const result = await query<MealMenu>(
        `
          INSERT INTO meal_menus (
            name,
            description
          )
          VALUES ($1, $2)
          RETURNING
            id,
            name,
            description,
            0::int AS item_count,
            0::int AS day_count
        `,
        [
          parsed.data.name,
          parsed.data.description ?? null,
        ],
      );

      res.status(201).json({
        menu: result.rows[0],
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error: "Menu already exists",
        });
        return;
      }

      throw error;
    }
  },
);

mealsRouter.post(
  "/menu-items",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createMealMenuItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid menu item",
      });
      return;
    }

    const result = await query<MealMenuItem>(
      `
        WITH inserted AS (
          INSERT INTO meal_menu_items (
            menu_id,
            item_id,
            meal_type_id,
            day_of_week,
            sort_order
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        )
        SELECT
          i.id,
          i.menu_id,
          i.item_id,
          i.meal_type_id,
          mt.name AS meal_type_name,
          i.day_of_week,
          mi.name,
          mi.description,
          mi.dietary_notes,
          i.sort_order
        FROM inserted i
        JOIN meal_items mi
          ON mi.id = i.item_id
        LEFT JOIN meal_types mt
          ON mt.id = i.meal_type_id
      `,
      [
        parsed.data.menu_id,
        parsed.data.item_id,
        parsed.data.meal_type_id ?? null,
        parsed.data.day_of_week ?? null,
        parsed.data.sort_order,
      ],
    );

    res.status(201).json({
      menu_item: result.rows[0],
    });
  },
);

mealsRouter.post(
  "/event-meals",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createEventMealSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid event meal",
      });
      return;
    }

    try {
      const result = await query<EventMeal>(
        `
          WITH inserted AS (
            INSERT INTO event_meals (
              event_id,
              meal_type_id,
              title,
              notes,
              starts_at,
              ends_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          )
          SELECT
            i.id,
            i.event_id,
            e.name AS event_name,
            i.meal_type_id,
            mt.name AS meal_type_name,
            e.meal_menu_id AS menu_id,
            mm.name AS menu_name,
            i.title,
            i.notes,
            i.starts_at,
            i.ends_at,
            i.composition_mode,
            '[]'::json AS items
          FROM inserted i
          JOIN events e
            ON e.id = i.event_id
          JOIN meal_types mt
            ON mt.id = i.meal_type_id
          LEFT JOIN meal_menus mm
            ON mm.id = e.meal_menu_id
        `,
        [
          parsed.data.event_id,
          parsed.data.meal_type_id,
          parsed.data.title ?? null,
          parsed.data.notes ?? null,
          parsed.data.starts_at,
          parsed.data.ends_at,
        ],
      );

      res.status(201).json({
        event_meal: result.rows[0],
      });
    } catch (error: any) {
      if (
        String(error?.message ?? "").includes(
          "EVENT_TIME_OUTSIDE_EVENT",
        )
      ) {
        res.status(409).json({
          error:
            "Meal must occur inside the event dates",
        });
        return;
      }

      throw error;
    }
  },
);

mealsRouter.patch(
  "/menus/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      mealMenuIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateMealMenuSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error: "Invalid menu update",
      });
      return;
    }

    try {
      const result = await query<MealMenu>(
        `
          UPDATE meal_menus
          SET
            name = COALESCE($2, name),
            description =
              CASE
                WHEN $3 THEN $4
                ELSE description
              END
          WHERE id = $1
          RETURNING
            id,
            name,
            description,
            (
              SELECT COUNT(*)::int
              FROM meal_menu_items
              WHERE menu_id = meal_menus.id
            ) AS item_count,
            (
              SELECT COUNT(DISTINCT day_of_week)::int
              FROM meal_menu_items
              WHERE menu_id = meal_menus.id
                AND day_of_week IS NOT NULL
            ) AS day_count
        `,
        [
          params.data.id,
          body.data.name ?? null,
          Object.prototype.hasOwnProperty.call(
            body.data,
            "description",
          ),
          body.data.description ?? null,
        ],
      );

      const menu = result.rows[0];

      if (!menu) {
        res.status(404).json({
          error: "Menu does not exist",
        });
        return;
      }

      res.json({ menu });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error: "Menu already exists",
        });
        return;
      }

      throw error;
    }
  },
);

mealsRouter.post(
  "/menus/:id/apply-to-event",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      mealMenuIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      applyMealMenuSchema.safeParse(
        req.body,
      );

    if (!params.success || !body.success) {
      res.status(400).json({
        error: "Invalid menu or event",
      });
      return;
    }

    const menu = await query<{ id: string }>(
      `SELECT id FROM meal_menus WHERE id = $1`,
      [params.data.id],
    );

    if (!menu.rows[0]) {
      res.status(404).json({
        error: "Menu does not exist",
      });
      return;
    }

    const result = await query<{
      event_id: string;
      menu_id: string;
      scheduled_meals: number;
    }>(
      `
        WITH assigned AS (
          UPDATE events
          SET meal_menu_id = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING id, meal_menu_id
        )
        SELECT
          a.id AS event_id,
          a.meal_menu_id AS menu_id,
          (
            SELECT COUNT(*)::int
            FROM event_meals em
            WHERE em.event_id = a.id
          ) AS scheduled_meals
        FROM assigned a
      `,
      [params.data.id, body.data.event_id],
    );

    const assignment = result.rows[0];

    if (!assignment) {
      res.status(404).json({
        error: "Event does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      ...assignment,
    });
  },
);

mealsRouter.delete(
  "/menus/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      mealMenuIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error: "Invalid menu id",
      });
      return;
    }

    try {
      const result = await query<{ id: string }>(
        `
          DELETE FROM meal_menus
          WHERE id = $1
          RETURNING id
        `,
        [params.data.id],
      );

      if (!result.rows[0]) {
        res.status(404).json({
          error: "Menu does not exist",
        });
        return;
      }

      res.json({
        ok: true,
        deleted_menu_id:
          result.rows[0].id,
      });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error:
            "This menu is still assigned to an event or contains menu selections",
        });
        return;
      }

      throw error;
    }
  },
);

mealsRouter.patch(
  "/menu-items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      mealMenuItemIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateMealMenuItemSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error:
          "Invalid menu item assignment update",
      });
      return;
    }

    const result = await query<MealMenuItem>(
      `
        WITH updated AS (
          UPDATE meal_menu_items
          SET
            menu_id =
              COALESCE($2, menu_id),
            item_id =
              COALESCE($3, item_id),
            meal_type_id =
              CASE
                WHEN $4 THEN $5
                ELSE meal_type_id
              END,
            day_of_week =
              CASE
                WHEN $6 THEN $7
                ELSE day_of_week
              END,
            sort_order =
              COALESCE($8, sort_order)
          WHERE id = $1
          RETURNING *
        )
        SELECT
          u.id,
          u.menu_id,
          u.item_id,
          u.meal_type_id,
          mt.name AS meal_type_name,
          u.day_of_week,
          mi.name,
          mi.description,
          mi.dietary_notes,
          u.sort_order
        FROM updated u
        JOIN meal_items mi
          ON mi.id = u.item_id
        LEFT JOIN meal_types mt
          ON mt.id = u.meal_type_id
      `,
      [
        params.data.id,
        body.data.menu_id ?? null,
        body.data.item_id ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "meal_type_id",
        ),
        body.data.meal_type_id ?? null,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "day_of_week",
        ),
        body.data.day_of_week ?? null,
        body.data.sort_order ?? null,
      ],
    );

    const item = result.rows[0];

    if (!item) {
      res.status(404).json({
        error: "Menu item assignment does not exist",
      });
      return;
    }

    res.json({
      menu_item: item,
    });
  },
);

mealsRouter.delete(
  "/menu-items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      mealMenuItemIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error: "Invalid menu item id",
      });
      return;
    }

    const result = await query<{ id: string }>(
      `
        DELETE FROM meal_menu_items
        WHERE id = $1
        RETURNING id
      `,
      [params.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Menu item does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_menu_item_id:
        result.rows[0].id,
    });
  },
);

mealsRouter.patch(
  "/event-meals/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      eventMealIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateEventMealSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error:
          "Invalid scheduled meal update",
      });
      return;
    }

    try {
      const result = await query<EventMeal>(
        `
          WITH updated AS (
            UPDATE event_meals
            SET
              event_id = COALESCE($2, event_id),
              meal_type_id = COALESCE($3, meal_type_id),
              title = CASE WHEN $4 THEN $5 ELSE title END,
              notes = CASE WHEN $6 THEN $7 ELSE notes END,
              starts_at = COALESCE($8, starts_at),
              ends_at = COALESCE($9, ends_at)
            WHERE id = $1
            RETURNING *
          )
          SELECT
            u.id,
            u.event_id,
            e.name AS event_name,
            u.meal_type_id,
            mt.name AS meal_type_name,
            e.meal_menu_id AS menu_id,
            mm.name AS menu_name,
            u.title,
            u.notes,
            u.starts_at,
            u.ends_at,
            u.composition_mode,
            '[]'::json AS items
          FROM updated u
          JOIN events e
            ON e.id = u.event_id
          JOIN meal_types mt
            ON mt.id = u.meal_type_id
          LEFT JOIN meal_menus mm
            ON mm.id = e.meal_menu_id
        `,
        [
          params.data.id,
          body.data.event_id ?? null,
          body.data.meal_type_id ?? null,
          Object.prototype.hasOwnProperty.call(body.data, "title"),
          body.data.title ?? null,
          Object.prototype.hasOwnProperty.call(body.data, "notes"),
          body.data.notes ?? null,
          body.data.starts_at ?? null,
          body.data.ends_at ?? null,
        ],
      );

      const eventMeal = result.rows[0];

      if (!eventMeal) {
        res.status(404).json({
          error:
            "Scheduled meal does not exist",
        });
        return;
      }

      res.json({
        event_meal: eventMeal,
      });
    } catch (error: any) {
      if (
        String(
          error?.message ?? "",
        ).includes(
          "EVENT_TIME_OUTSIDE_EVENT",
        )
      ) {
        res.status(409).json({
          error:
            "Meal must occur inside the event dates",
        });
        return;
      }

      if (error?.code === "23505") {
        res.status(409).json({
          error:
            "That meal is already scheduled at this time",
        });
        return;
      }

      throw error;
    }
  },
);

mealsRouter.delete(
  "/event-meals/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      eventMealIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error:
          "Invalid scheduled meal id",
      });
      return;
    }

    const result = await query<{ id: string }>(
      `
        DELETE FROM event_meals
        WHERE id = $1
        RETURNING id
      `,
      [params.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error:
          "Scheduled meal does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_event_meal_id:
        result.rows[0].id,
    });
  },
);
