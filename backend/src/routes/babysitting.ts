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

  const result =
    await query<BabysittingRequest>(
      `
        SELECT
          br.id,
          br.event_registration_id,
          e.name AS event_name,
          a.username,
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
        GROUP BY
          br.id,
          e.name,
          a.username,
          sm.full_name
        ORDER BY br.starts_at, br.id
      `,
      [
        accountType,
        req.auth!.sub,
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

    try {
      const result = await query<{ id: string }>(
        `
          UPDATE babysitting_requests
          SET
            sitter_staff_member_id =
              CASE
                WHEN $2 THEN $3
                ELSE sitter_staff_member_id
              END,
            status =
              COALESCE($4, status)
          WHERE id = $1
          RETURNING id
        `,
        [
          params.data.id,
          Object.prototype.hasOwnProperty.call(
            body.data,
            "sitter_staff_member_id",
          ),
          body.data.sitter_staff_member_id ?? null,
          body.data.status ?? null,
        ],
      );

      if (!result.rows[0]) {
        res.status(404).json({
          error:
            "Babysitting request does not exist",
        });
        return;
      }

      res.json({ ok: true });
    } catch (error: any) {
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
    }
  },
);
