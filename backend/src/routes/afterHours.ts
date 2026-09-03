import { Router } from "express";

import {
  afterHoursItemIdParamsSchema,
  afterHoursOrderIdParamsSchema,
  createAfterHoursItemSchema,
  createAfterHoursOrderSchema,
  updateAfterHoursItemSchema,
  updateAfterHoursOrderSchema,
  type AfterHoursItem,
  type AfterHoursOrder,
} from "@appoponi/shared/schemas/afterHours";

import { pool } from "../db/pool.js";
import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const afterHoursRouter = Router();

afterHoursRouter.use(
  requireAuth,
  requirePasswordChanged,
);

afterHoursRouter.get("/items", async (req, res) => {
  const showAll =
    req.auth!.account_type === "admin";

  const result = await query<AfterHoursItem>(
    `
      SELECT
        id,
        name,
        description,
        available
      FROM after_hours_items
      WHERE (
        $1::boolean = TRUE
        OR available = TRUE
      )
      ORDER BY name, id
    `,
    [showAll],
  );

  res.json({
    items: result.rows,
  });
});

afterHoursRouter.post(
  "/items",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createAfterHoursItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid after-hours item",
      });
      return;
    }

    try {
      const result = await query<AfterHoursItem>(
        `
          INSERT INTO after_hours_items (
            name,
            description
          )
          VALUES ($1, $2)
          RETURNING
            id,
            name,
            description,
            available
        `,
        [
          parsed.data.name,
          parsed.data.description ?? null,
        ],
      );

      res.status(201).json({
        item: result.rows[0],
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error: "Item already exists",
        });
        return;
      }

      throw error;
    }
  },
);

afterHoursRouter.get("/orders", async (req, res) => {
  const accountType =
    req.auth!.account_type;

  const result = await query<AfterHoursOrder>(
    `
      SELECT
        o.id,
        o.event_registration_id,
        e.name AS event_name,
        a.username,
        o.requested_by_member_id,
        hm.full_name AS requested_by_name,
        o.assigned_staff_member_id,
        sm.full_name AS assigned_staff_name,
        o.fulfillment,
        o.delivery_location,
        o.status,
        o.notes,
        o.created_at
      FROM after_hours_orders o
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
      ORDER BY o.created_at DESC
    `,
    [
      accountType,
      req.auth!.sub,
    ],
  );

  res.json({
    orders: result.rows,
  });
});

afterHoursRouter.post(
  "/orders",
  requireAccountType("member"),
  async (req, res) => {
    const parsed =
      createAfterHoursOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid after-hours order",
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

      const registration =
        await client.query<{ id: string }>(
          `
            SELECT id
            FROM event_registrations
            WHERE id = $1
              AND account_id = $2
            FOR UPDATE
          `,
          [
            parsed.data.event_registration_id,
            req.auth!.sub,
          ],
        );

      if (!registration.rows[0]) {
        await client.query("ROLLBACK");

        res.status(403).json({
          error:
            "Registration does not belong to this household",
        });
        return;
      }

      const orderResult =
        await client.query<{ id: string }>(
          `
            INSERT INTO after_hours_orders (
              event_registration_id,
              requested_by_member_id,
              fulfillment,
              delivery_location,
              notes
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [
            parsed.data.event_registration_id,
            parsed.data.requested_by_member_id ?? null,
            parsed.data.fulfillment,
            parsed.data.delivery_location ?? null,
            parsed.data.notes ?? null,
          ],
        );

      const orderId =
        orderResult.rows[0].id;

      for (const item of parsed.data.items) {
        await client.query(
          `
            INSERT INTO after_hours_order_items (
              order_id,
              item_id,
              quantity
            )
            VALUES ($1, $2, $3)
          `,
          [
            orderId,
            item.item_id,
            item.quantity,
          ],
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        ok: true,
        order_id: orderId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

afterHoursRouter.patch(
  "/orders/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      afterHoursOrderIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateAfterHoursOrderSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error: "Invalid order update",
      });
      return;
    }

    const result = await query<{ id: string }>(
      `
        UPDATE after_hours_orders
        SET
          assigned_staff_member_id =
            CASE
              WHEN $2 THEN $3
              ELSE assigned_staff_member_id
            END,
          status = COALESCE($4, status)
        WHERE id = $1
        RETURNING id
      `,
      [
        params.data.id,
        Object.prototype.hasOwnProperty.call(
          body.data,
          "assigned_staff_member_id",
        ),
        body.data.assigned_staff_member_id ?? null,
        body.data.status ?? null,
      ],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Order does not exist",
      });
      return;
    }

    res.json({ ok: true });
  },
);

afterHoursRouter.patch(
  "/items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      afterHoursItemIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateAfterHoursItemSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error:
          "Invalid after-hours item update",
      });
      return;
    }

    try {
      const result =
        await query<AfterHoursItem>(
          `
            UPDATE after_hours_items
            SET
              name =
                COALESCE($2, name),
              description =
                CASE
                  WHEN $3 THEN $4
                  ELSE description
                END,
              available =
                COALESCE(
                  $5,
                  available
                )
            WHERE id = $1
            RETURNING
              id,
              name,
              description,
              available
          `,
          [
            params.data.id,
            body.data.name ?? null,
            Object.prototype.hasOwnProperty.call(
              body.data,
              "description",
            ),
            body.data.description ?? null,
            body.data.available ?? null,
          ],
        );

      const item =
        result.rows[0];

      if (!item) {
        res.status(404).json({
          error:
            "After-hours item does not exist",
        });
        return;
      }

      res.json({ item });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error: "Item already exists",
        });
        return;
      }

      throw error;
    }
  },
);

afterHoursRouter.delete(
  "/items/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      afterHoursItemIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error:
          "Invalid after-hours item id",
      });
      return;
    }

    try {
      const result =
        await query<{ id: string }>(
          `
            DELETE FROM after_hours_items
            WHERE id = $1
            RETURNING id
          `,
          [params.data.id],
        );

      if (!result.rows[0]) {
        res.status(404).json({
          error:
            "After-hours item does not exist",
        });
        return;
      }

      res.json({
        ok: true,
        deleted_item_id:
          result.rows[0].id,
      });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error:
            "This item has order history. Make it unavailable instead of deleting it.",
        });
        return;
      }

      throw error;
    }
  },
);

afterHoursRouter.patch(
  "/orders/:id/cancel",
  requireAccountType("member"),
  async (req, res) => {
    const params =
      afterHoursOrderIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error: "Invalid order id",
      });
      return;
    }

    const result =
      await query<{ id: string }>(
        `
          UPDATE after_hours_orders o
          SET status = 'cancelled'
          FROM event_registrations er
          WHERE o.id = $1
            AND er.id =
              o.event_registration_id
            AND er.account_id = $2
            AND o.status = 'open'
          RETURNING o.id
        `,
        [
          params.data.id,
          req.auth!.sub,
        ],
      );

    if (!result.rows[0]) {
      res.status(409).json({
        error:
          "Only your open orders can be cancelled",
      });
      return;
    }

    res.json({ ok: true });
  },
);
