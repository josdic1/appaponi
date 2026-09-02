import { Router } from "express";

import {
  assignRegistrationCabinSchema,
  createEventRegistrationSchema,
  registrationIdParamsSchema,
  updateEventRegistrationSchema,
  type EventRegistration,
} from "@appoponi/shared/schemas/registration";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const registrationsRouter = Router();

registrationsRouter.get(
  "/",
  requireAuth,
  requirePasswordChanged,
  async (req, res) => {
    try {
      const isAdmin =
        req.auth!.account_type === "admin";

      const result =
        await query<EventRegistration>(
          `
            SELECT
              er.id,
              er.account_id,
              a.username,
              er.event_id,
              e.name AS event_name,
              er.spots_paid_for,
              (
                SELECT COUNT(*)::int
                FROM member_attendees ma
                JOIN household_members hm
                  ON hm.id = ma.member_id
                WHERE hm.account_id = er.account_id
                  AND ma.event_id = er.event_id
              ) AS selected_attendees,
              er.cabin_id,
              c.name AS cabin_name,
              c.map_x AS cabin_map_x,
              c.map_y AS cabin_map_y,
              er.share_cabin_publicly
            FROM event_registrations er
            JOIN accounts a
              ON a.id = er.account_id
            JOIN events e
              ON e.id = er.event_id
            LEFT JOIN cabins c
              ON c.id = er.cabin_id
            WHERE (
              $1::boolean = TRUE
              OR er.account_id = $2
            )
            ORDER BY e.starts_at, a.username
          `,
          [
            isAdmin,
            req.auth!.sub,
          ],
        );

      res.json({
        registrations: result.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load registrations",
      });
    }
  },
);

registrationsRouter.post(
  "/",
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createEventRegistrationSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid event registration",
      });
      return;
    }

    try {
      const result =
        await query<EventRegistration>(
          `
            WITH inserted AS (
              INSERT INTO event_registrations (
                account_id,
                event_id,
                spots_paid_for
              )
              VALUES ($1, $2, $3)
              RETURNING *
            )
            SELECT
              i.id,
              i.account_id,
              a.username,
              i.event_id,
              e.name AS event_name,
              i.spots_paid_for,
              0::int AS selected_attendees,
              i.cabin_id,
              c.name AS cabin_name,
              c.map_x AS cabin_map_x,
              c.map_y AS cabin_map_y,
              i.share_cabin_publicly
            FROM inserted i
            JOIN accounts a
              ON a.id = i.account_id
            JOIN events e
              ON e.id = i.event_id
            LEFT JOIN cabins c
              ON c.id = i.cabin_id
          `,
          [
            parsed.data.account_id,
            parsed.data.event_id,
            parsed.data.spots_paid_for,
          ],
        );

      res.status(201).json({
        registration: result.rows[0],
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error:
            "Household is already registered for this event",
        });
        return;
      }

      if (
        String(error?.message ?? "").includes(
          "MEMBER_ACCOUNT_REQUIRED",
        )
      ) {
        res.status(409).json({
          error:
            "Only member accounts can register for events",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not create registration",
      });
    }
  },
);

registrationsRouter.patch(
  "/:id",
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      registrationIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateEventRegistrationSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error:
          "Invalid registration update",
      });
      return;
    }

    try {
      const result = await query<{
        id: string;
      }>(
        `
          UPDATE event_registrations
          SET spots_paid_for = $2
          WHERE id = $1
          RETURNING id
        `,
        [
          params.data.id,
          body.data.spots_paid_for,
        ],
      );

      if (!result.rows[0]) {
        res.status(404).json({
          error:
            "Registration does not exist",
        });
        return;
      }

      res.json({ ok: true });
    } catch (error: any) {
      if (
        String(error?.message ?? "").includes(
          "EVENT_REGISTRATION_BELOW_SELECTED_ATTENDEES",
        )
      ) {
        res.status(409).json({
          error:
            "Paid spots cannot be lower than the number of selected attendees",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not update registration",
      });
    }
  },
);


registrationsRouter.patch(
  "/:id/cabin",
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      registrationIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      assignRegistrationCabinSchema.safeParse(
        req.body,
      );

    if (!params.success || !body.success) {
      res.status(400).json({
        error: "Invalid cabin assignment",
      });
      return;
    }

    try {
      const result = await query<{
        id: string;
      }>(
        `
          UPDATE event_registrations
          SET cabin_id = $2
          WHERE id = $1
          RETURNING id
        `,
        [
          params.data.id,
          body.data.cabin_id,
        ],
      );

      if (!result.rows[0]) {
        res.status(404).json({
          error:
            "Registration does not exist",
        });
        return;
      }

      res.json({ ok: true });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error: "Cabin does not exist",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not assign cabin",
      });
    }
  },
);
