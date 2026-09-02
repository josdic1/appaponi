import { Router } from "express";

import {
  createEventMealSchema,
  createMealMenuItemSchema,
  createMealMenuSchema,
  type EventMeal,
  type MealMenu,
  type MealMenuItem,
  type MealType,
} from "@appoponi/shared/schemas/meals";

import { query } from "../db/db.js";

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

mealsRouter.get("/menus", async (_req, res) => {
  const result = await query<MealMenu>(`
    SELECT id, name, description
    FROM meal_menus
    ORDER BY name, id
  `);

  res.json({
    menus: result.rows,
  });
});

mealsRouter.get("/menu-items", async (req, res) => {
  const menuId =
    typeof req.query.menu_id === "string"
      ? Number(req.query.menu_id)
      : null;

  const result = await query<MealMenuItem>(
    `
      SELECT
        id,
        menu_id,
        name,
        description,
        dietary_notes,
        sort_order
      FROM meal_menu_items
      WHERE (
        $1::bigint IS NULL
        OR menu_id = $1
      )
      ORDER BY
        menu_id,
        sort_order,
        id
    `,
    [menuId],
  );

  res.json({
    menu_items: result.rows,
  });
});

mealsRouter.get("/event-meals", async (req, res) => {
  const unrestricted =
    req.auth!.account_type === "admin" ||
    req.auth!.account_type === "staff";

  const result = await query<EventMeal>(
    `
      SELECT
        em.id,
        em.event_id,
        e.name AS event_name,
        em.meal_type_id,
        mt.name AS meal_type_name,
        em.menu_id,
        mm.name AS menu_name,
        em.title,
        em.notes,
        em.starts_at,
        em.ends_at
      FROM event_meals em
      JOIN events e
        ON e.id = em.event_id
      JOIN meal_types mt
        ON mt.id = em.meal_type_id
      LEFT JOIN meal_menus mm
        ON mm.id = em.menu_id
      WHERE (
        $1::boolean = TRUE
        OR EXISTS (
          SELECT 1
          FROM event_registrations er
          WHERE er.event_id = em.event_id
            AND er.account_id = $2
        )
      )
      ORDER BY em.starts_at, em.id
    `,
    [
      unrestricted,
      req.auth!.sub,
    ],
  );

  res.json({
    event_meals: result.rows,
  });
});

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
            description
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
        INSERT INTO meal_menu_items (
          menu_id,
          name,
          description,
          dietary_notes,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          menu_id,
          name,
          description,
          dietary_notes,
          sort_order
      `,
      [
        parsed.data.menu_id,
        parsed.data.name,
        parsed.data.description ?? null,
        parsed.data.dietary_notes ?? null,
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
              menu_id,
              title,
              notes,
              starts_at,
              ends_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7
            )
            RETURNING *
          )
          SELECT
            i.id,
            i.event_id,
            e.name AS event_name,
            i.meal_type_id,
            mt.name AS meal_type_name,
            i.menu_id,
            mm.name AS menu_name,
            i.title,
            i.notes,
            i.starts_at,
            i.ends_at
          FROM inserted i
          JOIN events e
            ON e.id = i.event_id
          JOIN meal_types mt
            ON mt.id = i.meal_type_id
          LEFT JOIN meal_menus mm
            ON mm.id = i.menu_id
        `,
        [
          parsed.data.event_id,
          parsed.data.meal_type_id,
          parsed.data.menu_id ?? null,
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
