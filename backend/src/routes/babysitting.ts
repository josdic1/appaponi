import { Router } from "express";

import {
  babysittingRequestIdParamsSchema,
  createBabysittingRequestSchema,
  updateBabysittingRequestSchema,
  type BabysittingRequest,
} from "@appoponi/shared/schemas/babysitting";

import { pool } from "../db/pool.js";
import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const babysittingRouter = Router();

babysittingRouter.use(
  requireAuth,
  requirePasswordChanged,
);

babysittingRouter.get("/", async (req, res) => {
  const accountType =
    req.auth!.account_type;

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

  const result =
    await query<BabysittingRequest>(
      `
        SELECT
          br.id,
          br.event_registration_id,
          er.event_id,
          e.name AS event_name,
          COALESCE(
            a.display_name,
            a.username
          ) AS username,
          br.sitter_staff_member_id,
          sm.full_name AS sitter_name,
          br.starts_at,
          br.ends_at,
          br.status,
          br.notes,
          COALESCE(
            ARRAY_AGG(
              hm.full_name
              ORDER BY hm.full_name
            ) FILTER (
              WHERE hm.id IS NOT NULL
            ),
            ARRAY[]::text[]
          ) AS member_names
        FROM babysitting_requests br
        JOIN event_registrations er
          ON er.id =
            br.event_registration_id
        JOIN events e
          ON e.id = er.event_id
        JOIN accounts a
          ON a.id = er.account_id
        LEFT JOIN staff_members sm
          ON sm.id =
            br.sitter_staff_member_id
        LEFT JOIN babysitting_request_members brm
          ON brm.babysitting_request_id =
            br.id
        LEFT JOIN household_members hm
          ON hm.id = brm.member_id
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
        GROUP BY
          br.id,
          er.event_id,
          e.name,
          a.display_name,
          a.username,
          sm.full_name
        ORDER BY br.starts_at, br.id
      `,
      [
        accountType,
        req.auth!.sub,
        eventId,
      ],
    );

  res.json({
    requests: result.rows,
  });
});

babysittingRouter.post(
  "/",
  requireAccountType("member"),
  async (req, res) => {
    const parsed =
      createBabysittingRequestSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid babysitting request",
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

      const requestResult =
        await client.query<{ id: string }>(
          `
            INSERT INTO babysitting_requests (
              event_registration_id,
              starts_at,
              ends_at,
              notes
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `,
          [
            parsed.data.event_registration_id,
            parsed.data.starts_at,
            parsed.data.ends_at,
            parsed.data.notes ?? null,
          ],
        );

      const requestId =
        requestResult.rows[0].id;

      for (const memberId of parsed.data.member_ids) {
        const memberResult =
          await client.query<{ id: string }>(
            `
              SELECT id
              FROM household_members
              WHERE id = $1
                AND account_id = $2
              LIMIT 1
            `,
            [
              memberId,
              req.auth!.sub,
            ],
          );

        if (!memberResult.rows[0]) {
          throw new Error(
            "BABYSITTING_MEMBER_WRONG_HOUSEHOLD",
          );
        }

        await client.query(
          `
            INSERT INTO babysitting_request_members (
              babysitting_request_id,
              member_id
            )
            VALUES ($1, $2)
          `,
          [
            requestId,
            memberId,
          ],
        );
      }

      await client.query("COMMIT");

      res.status(201).json({
        ok: true,
        request_id: requestId,
      });
    } catch (error: any) {
      await client.query("ROLLBACK");

      const message =
        String(error?.message ?? "");

      if (
        message.includes(
          "BABYSITTING_OUTSIDE_EVENT",
        )
      ) {
        res.status(409).json({
          error:
            "Babysitting must occur inside the event dates",
        });
        return;
      }

      if (
        message.includes(
          "BABYSITTING_MEMBER_WRONG_HOUSEHOLD",
        )
      ) {
        res.status(409).json({
          error:
            "All selected people must belong to this household",
        });
        return;
      }

      throw error;
    } finally {
      client.release();
    }
  },
);

babysittingRouter.patch(
  "/:id",
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      babysittingRequestIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateBabysittingRequestSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error:
          "Invalid babysitting update",
      });
      return;
    }

    const hasSitterUpdate =
      Object.prototype.hasOwnProperty.call(
        body.data,
        "sitter_staff_member_id",
      );

    if (
      !hasSitterUpdate &&
      body.data.status === undefined
    ) {
      res.status(400).json({
        error:
          "No babysitting change supplied",
      });
      return;
    }

    const client =
      await pool.connect();

    try {
      await client.query("BEGIN");

      const currentResult =
        await client.query<{
          status:
            | "pending"
            | "confirmed"
            | "completed"
            | "cancelled";
          sitter_staff_member_id:
            | string
            | null;
        }>(
          `
            SELECT
              status,
              sitter_staff_member_id
            FROM babysitting_requests
            WHERE id = $1
            FOR UPDATE
          `,
          [params.data.id],
        );

      const current =
        currentResult.rows[0];

      if (!current) {
        await client.query(
          "ROLLBACK",
        );

        res.status(404).json({
          error:
            "Babysitting request does not exist",
        });
        return;
      }

      if (
        current.status ===
          "completed" ||
        current.status ===
          "cancelled"
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(409).json({
          error:
            "Completed and cancelled babysitting requests are locked",
        });
        return;
      }

      if (
        body.data.status ===
        "completed"
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(409).json({
          error:
            "Only the assigned staff member can mark babysitting completed",
        });
        return;
      }

      const nextStatus =
        body.data.status ??
        current.status;

      if (
        current.status ===
          "confirmed" &&
        nextStatus === "pending"
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(409).json({
          error:
            "A confirmed booking cannot be moved back to pending",
        });
        return;
      }

      const nextSitterId =
        hasSitterUpdate
          ? (
              body.data
                .sitter_staff_member_id ??
              null
            )
          : current
              .sitter_staff_member_id;

      if (
        nextStatus ===
          "confirmed" &&
        nextSitterId === null
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(409).json({
          error:
            "Choose an eligible sitter before confirming the booking",
        });
        return;
      }

      await client.query(
        `
          UPDATE babysitting_requests
          SET
            sitter_staff_member_id = $2,
            status = $3
          WHERE id = $1
        `,
        [
          params.data.id,
          nextSitterId,
          nextStatus,
        ],
      );

      await client.query("COMMIT");

      res.json({ ok: true });
    } catch (error: any) {
      await client.query("ROLLBACK");

      const message =
        String(error?.message ?? "");

      if (
        message.includes(
          "STAFF_NOT_BABYSITTING_ELIGIBLE",
        )
      ) {
        res.status(409).json({
          error:
            "That staff member is not available for babysitting",
        });
        return;
      }

      if (
        message.includes(
          "BABYSITTING_TIME_CONFLICT",
        ) ||
        message.includes(
          "STAFF_ACTIVITY_TIME_CONFLICT",
        )
      ) {
        res.status(409).json({
          error:
            "That staff member is already scheduled at this time",
        });
        return;
      }

      throw error;
    } finally {
      client.release();
    }
  },
);

babysittingRouter.patch(
  "/:id/complete",
  requireAccountType("staff"),
  async (req, res) => {
    const params =
      babysittingRequestIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error: "Invalid babysitting request id",
      });
      return;
    }

    const result = await query<{ id: string }>(
      `
        UPDATE babysitting_requests br
        SET status = 'completed'
        FROM staff_members sm
        WHERE br.id = $1
          AND br.sitter_staff_member_id = sm.id
          AND sm.account_id = $2
          AND br.status = 'confirmed'
        RETURNING br.id
      `,
      [params.data.id, req.auth!.sub],
    );

    if (!result.rows[0]) {
      res.status(409).json({
        error: "Assigned confirmed babysitting request does not exist",
      });
      return;
    }

    res.json({ ok: true });
  },
);

babysittingRouter.patch(
  "/:id/cancel",
  requireAccountType("member"),
  async (req, res) => {
    const params =
      babysittingRequestIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error:
          "Invalid babysitting request id",
      });
      return;
    }

    const result =
      await query<{ id: string }>(
        `
          UPDATE babysitting_requests br
          SET status = 'cancelled'
          FROM event_registrations er
          WHERE br.id = $1
            AND er.id =
              br.event_registration_id
            AND er.account_id = $2
            AND br.status IN (
              'pending',
              'confirmed'
            )
          RETURNING br.id
        `,
        [
          params.data.id,
          req.auth!.sub,
        ],
      );

    if (!result.rows[0]) {
      res.status(409).json({
        error:
          "Only your pending or confirmed requests can be cancelled",
      });
      return;
    }

    res.json({ ok: true });
  },
);
