import { Router } from "express";

import {
  foodOfferingIdParamsSchema,
  foodOrderIdParamsSchema,
  createFoodOfferingSchema,
  createFoodOrderSchema,
  updateFoodOfferingSchema,
  updateFoodOrderSchema,
  type FoodOffering,
  type FoodOrder,
} from "@appoponi/shared/schemas/foodOrders";

import { pool } from "../db/pool.js";
import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const foodRouter = Router();

foodRouter.use(
  requireAuth,
  requirePasswordChanged,
);

foodRouter.get("/items", async (req, res) => {
  const eventId =
    typeof req.query.event_id === "string" && req.query.event_id
      ? Number(req.query.event_id)
      : null;

  if (eventId !== null && (!Number.isInteger(eventId) || eventId <= 0)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const isAdmin = req.auth!.account_type === "admin";

  const result = await query<FoodOffering>(
    `
      SELECT
        efo.id,
        efo.event_id,
        efo.item_id,
        efo.offering_type,
        mi.name,
        mi.description,
        mi.dietary_notes,
        efo.available,
        efo.sort_order
      FROM event_food_offerings efo
      JOIN meal_items mi
        ON mi.id = efo.item_id
      WHERE (
        $1::bigint IS NULL
        OR efo.event_id = $1
      )
        AND (
          $2::boolean = TRUE
          OR EXISTS (
            SELECT 1
            FROM event_registrations er
            WHERE er.event_id = efo.event_id
              AND er.account_id = $3
          )
        )
        AND (
          $2::boolean = TRUE
          OR efo.available = TRUE
        )
      ORDER BY efo.event_id, efo.offering_type, efo.sort_order, LOWER(mi.name), efo.id
    `,
    [eventId, isAdmin, req.auth!.sub],
  );

  res.json({ items: result.rows });
});

foodRouter.post(
  "/items",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed = createFoodOfferingSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid food offering" });
      return;
    }

    const sortOrder = parsed.data.sort_order ?? (
      await query<{ next_sort: number }>(
        `
          SELECT COALESCE(MAX(sort_order), 0)::int + 10 AS next_sort
          FROM event_food_offerings
          WHERE event_id = $1
            AND offering_type = $2
        `,
        [parsed.data.event_id, parsed.data.offering_type],
      )
    ).rows[0].next_sort;

    const result = await query<FoodOffering>(
      `
        WITH assigned AS (
          INSERT INTO event_food_offerings (
            event_id,
            item_id,
            offering_type,
            sort_order,
            available
          )
          VALUES ($1, $2, $3, $4, TRUE)
          ON CONFLICT (event_id, offering_type, item_id)
          DO UPDATE SET
            available = TRUE,
            sort_order = LEAST(event_food_offerings.sort_order, EXCLUDED.sort_order)
          RETURNING *
        )
        SELECT
          a.id,
          a.event_id,
          a.item_id,
          a.offering_type,
          mi.name,
          mi.description,
          mi.dietary_notes,
          a.available,
          a.sort_order
        FROM assigned a
        JOIN meal_items mi
          ON mi.id = a.item_id
      `,
      [parsed.data.event_id, parsed.data.item_id, parsed.data.offering_type, sortOrder],
    );

    res.status(201).json({ item: result.rows[0] });
  },
);

foodRouter.patch(
  "/items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = foodOfferingIdParamsSchema.safeParse(req.params);
    const body = updateFoodOfferingSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid food offering update" });
      return;
    }

    const result = await query<FoodOffering>(
      `
        WITH updated AS (
          UPDATE event_food_offerings
          SET
            available = COALESCE($2, available),
            sort_order = COALESCE($3, sort_order)
          WHERE id = $1
          RETURNING *
        )
        SELECT
          u.id,
          u.event_id,
          u.item_id,
          u.offering_type,
          mi.name,
          mi.description,
          mi.dietary_notes,
          u.available,
          u.sort_order
        FROM updated u
        JOIN meal_items mi
          ON mi.id = u.item_id
      `,
      [
        params.data.id,
        body.data.available ?? null,
        body.data.sort_order ?? null,
      ],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Food offering does not exist" });
      return;
    }

    res.json({ item: result.rows[0] });
  },
);

foodRouter.delete(
  "/items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = foodOfferingIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: "Invalid food offering id" });
      return;
    }

    const result = await query<{ id: string }>(
      `DELETE FROM event_food_offerings WHERE id = $1 RETURNING id`,
      [params.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Food offering does not exist" });
      return;
    }

    res.json({ ok: true, deleted_item_id: result.rows[0].id });
  },
);

foodRouter.get("/orders", async (req, res) => {
  const accountType = req.auth!.account_type;

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

  const result = await query<FoodOrder>(
    `
      SELECT
        o.id,
        o.event_registration_id,
        er.event_id,
        e.name AS event_name,
        o.offering_type,
        COALESCE(a.display_name, a.username) AS username,
        o.requested_by_member_id,
        hm.full_name AS requested_by_name,
        o.assigned_staff_member_id,
        sm.full_name AS assigned_staff_name,
        o.fulfillment,
        o.delivery_location,
        o.status,
        o.notes,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'item_id', oi.item_id::text,
                'item_name', item.name,
                'quantity', oi.quantity
              )
              ORDER BY item.name, oi.id
            )
            FROM food_order_items oi
            JOIN meal_items item
              ON item.id = oi.item_id
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items,
        o.created_at
      FROM food_orders o
      JOIN event_registrations er
        ON er.id = o.event_registration_id
      JOIN events e
        ON e.id = er.event_id
      JOIN accounts a
        ON a.id = er.account_id
      LEFT JOIN household_members hm
        ON hm.id = o.requested_by_member_id
      LEFT JOIN staff_members sm
        ON sm.id = o.assigned_staff_member_id
      WHERE (
        $1 = 'admin'
        OR (
          $1 = 'member'
          AND er.account_id = $2
        )
        OR (
          $1 = 'staff'
          AND sm.account_id = $2
        )
      )
        AND (
          $3::bigint IS NULL
          OR er.event_id = $3
        )
      ORDER BY o.created_at DESC
    `,
    [accountType, req.auth!.sub, eventId],
  );

  res.json({ orders: result.rows });
});

foodRouter.post(
  "/orders",
  requireAccountType("member"),
  async (req, res) => {
    const parsed = createFoodOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid food order" });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `SELECT set_config('appoponi.actor_account_id', $1, true)`,
        [req.auth!.sub],
      );

      const registration = await client.query<{ id: string; event_id: string }>(
        `
          SELECT id, event_id
          FROM event_registrations
          WHERE id = $1
            AND account_id = $2
          FOR UPDATE
        `,
        [parsed.data.event_registration_id, req.auth!.sub],
      );

      const registrationRow = registration.rows[0];

      if (!registrationRow) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Registration does not belong to this household" });
        return;
      }

      if (parsed.data.offering_type === "SNACK" && parsed.data.fulfillment !== "pickup") {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "Snack orders are pickup only" });
        return;
      }

      const requestedItemIds = parsed.data.items.map((item) => item.item_id);
      const available = await client.query<{ item_id: string }>(
        `
          SELECT item_id
          FROM event_food_offerings
          WHERE event_id = $1
            AND offering_type = $2
            AND available = TRUE
            AND item_id = ANY($3::bigint[])
        `,
        [registrationRow.event_id, parsed.data.offering_type, requestedItemIds],
      );

      const availableIds = new Set(available.rows.map((item) => Number(item.item_id)));

      if (requestedItemIds.some((itemId) => !availableIds.has(itemId))) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "One or more food items are not available for this event" });
        return;
      }

      const orderResult = await client.query<{ id: string }>(
        `
          INSERT INTO food_orders (
            event_registration_id,
            requested_by_member_id,
            offering_type,
            fulfillment,
            delivery_location,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [
          parsed.data.event_registration_id,
          parsed.data.requested_by_member_id ?? null,
          parsed.data.offering_type,
          parsed.data.fulfillment,
          parsed.data.delivery_location ?? null,
          parsed.data.notes ?? null,
        ],
      );

      const orderId = orderResult.rows[0].id;

      for (const item of parsed.data.items) {
        await client.query(
          `
            INSERT INTO food_order_items (
              order_id,
              item_id,
              quantity
            )
            VALUES ($1, $2, $3)
          `,
          [orderId, item.item_id, item.quantity],
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ ok: true, order_id: orderId });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

foodRouter.patch(
  "/orders/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params = foodOrderIdParamsSchema.safeParse(req.params);
    const body = updateFoodOrderSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid order update" });
      return;
    }

    const result = await query<{ id: string }>(
      `
        UPDATE food_orders
        SET
          assigned_staff_member_id =
            CASE WHEN $2 THEN $3 ELSE assigned_staff_member_id END,
          status = COALESCE($4, status)
        WHERE id = $1
        RETURNING id
      `,
      [
        params.data.id,
        Object.prototype.hasOwnProperty.call(body.data, "assigned_staff_member_id"),
        body.data.assigned_staff_member_id ?? null,
        body.data.status ?? null,
      ],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Order does not exist" });
      return;
    }

    res.json({ ok: true });
  },
);

foodRouter.patch(
  "/orders/:id/fulfill",
  requireAccountType("staff"),
  async (req, res) => {
    const params = foodOrderIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const result = await query<{ id: string }>(
      `
        UPDATE food_orders o
        SET status = 'fulfilled'
        FROM staff_members sm
        WHERE o.id = $1
          AND o.assigned_staff_member_id = sm.id
          AND sm.account_id = $2
          AND o.status = 'open'
        RETURNING o.id
      `,
      [params.data.id, req.auth!.sub],
    );

    if (!result.rows[0]) {
      res.status(409).json({
        error: "Assigned open order does not exist",
      });
      return;
    }

    res.json({ ok: true });
  },
);

foodRouter.patch(
  "/orders/:id/cancel",
  requireAccountType("member"),
  async (req, res) => {
    const params = foodOrderIdParamsSchema.safeParse(req.params);

    if (!params.success) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const result = await query<{ id: string }>(
      `
        UPDATE food_orders o
        SET status = 'cancelled'
        FROM event_registrations er
        WHERE o.id = $1
          AND er.id = o.event_registration_id
          AND er.account_id = $2
          AND o.status = 'open'
        RETURNING o.id
      `,
      [params.data.id, req.auth!.sub],
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Open order does not exist" });
      return;
    }

    res.json({ ok: true });
  },
);
