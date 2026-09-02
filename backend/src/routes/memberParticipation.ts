import { Router } from "express";

import {
  activitySignupIdParamsSchema,
  createActivitySignupSchema,
  createMemberAttendeeSchema,
  memberAttendeeIdParamsSchema,
  type ActivitySignup,
  type MemberAttendee,
} from "@appoponi/shared/schemas/registration";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const memberParticipationRouter =
  Router();

memberParticipationRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("member"),
);

memberParticipationRouter.get(
  "/household",
  async (req, res) => {
    const result = await query(
      `
        SELECT
          id,
          account_id,
          full_name,
          email,
          phone,
          dietary_restrictions,
          member_role,
          created_at,
          updated_at
        FROM household_members
        WHERE account_id = $1
        ORDER BY
          CASE member_role
            WHEN 'primary' THEN 0
            WHEN 'adult' THEN 1
            ELSE 2
          END,
          full_name,
          id
      `,
      [req.auth!.sub],
    );

    res.json({
      household_members: result.rows,
    });
  },
);

memberParticipationRouter.get(
  "/attendees",
  async (req, res) => {
    const result =
      await query<MemberAttendee>(
        `
          SELECT
            ma.id,
            ma.member_id,
            hm.full_name,
            hm.member_role,
            ma.event_id,
            e.name AS event_name
          FROM member_attendees ma
          JOIN household_members hm
            ON hm.id = ma.member_id
          JOIN events e
            ON e.id = ma.event_id
          WHERE hm.account_id = $1
          ORDER BY e.starts_at, hm.full_name
        `,
        [req.auth!.sub],
      );

    res.json({
      attendees: result.rows,
    });
  },
);

memberParticipationRouter.post(
  "/attendees",
  async (req, res) => {
    const parsed =
      createMemberAttendeeSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid attendee",
      });
      return;
    }

    try {
      const result =
        await query<MemberAttendee>(
          `
            WITH inserted AS (
              INSERT INTO member_attendees (
                member_id,
                event_id
              )
              SELECT
                hm.id,
                $2
              FROM household_members hm
              WHERE hm.id = $1
                AND hm.account_id = $3
              RETURNING *
            )
            SELECT
              i.id,
              i.member_id,
              hm.full_name,
              hm.member_role,
              i.event_id,
              e.name AS event_name
            FROM inserted i
            JOIN household_members hm
              ON hm.id = i.member_id
            JOIN events e
              ON e.id = i.event_id
          `,
          [
            parsed.data.member_id,
            parsed.data.event_id,
            req.auth!.sub,
          ],
        );

      const attendee =
        result.rows[0];

      if (!attendee) {
        res.status(403).json({
          error:
            "That person is not part of this household",
        });
        return;
      }

      res.status(201).json({
        attendee,
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error:
            "That person is already attending this event",
        });
        return;
      }

      const message =
        String(error?.message ?? "");

      if (
        message.includes(
          "EVENT_REGISTRATION_REQUIRED",
        )
      ) {
        res.status(409).json({
          error:
            "Household is not registered for this event",
        });
        return;
      }

      if (
        message.includes(
          "EVENT_REGISTRATION_SPOTS_FULL",
        )
      ) {
        res.status(409).json({
          error:
            "All paid spots have already been assigned",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not add attendee",
      });
    }
  },
);

memberParticipationRouter.delete(
  "/attendees/:id",
  async (req, res) => {
    const parsed =
      memberAttendeeIdParamsSchema.safeParse(
        req.params,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid attendee id",
      });
      return;
    }

    try {
      const result = await query<{
        id: string;
      }>(
        `
          DELETE FROM member_attendees ma
          USING household_members hm
          WHERE ma.id = $1
            AND hm.id = ma.member_id
            AND hm.account_id = $2
          RETURNING ma.id
        `,
        [
          parsed.data.id,
          req.auth!.sub,
        ],
      );

      if (!result.rows[0]) {
        res.status(404).json({
          error:
            "Attendee does not exist",
        });
        return;
      }

      res.json({ ok: true });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error:
            "Remove this person's activity signups first",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not remove attendee",
      });
    }
  },
);

memberParticipationRouter.get(
  "/activities",
  async (req, res) => {
    const result = await query(
      `
        SELECT
          ea.id,
          ea.event_id,
          e.name AS event_name,
          ea.activity_id,
          a.name AS activity_name,
          ar.name AS area_name,
          ea.starts_at,
          ea.ends_at,
          ea.capacity,
          (
            SELECT COUNT(*)::int
            FROM event_activity_signups eas
            WHERE eas.event_activity_id = ea.id
          ) AS signup_count
        FROM event_activities ea
        JOIN events e
          ON e.id = ea.event_id
        JOIN activities a
          ON a.id = ea.activity_id
        JOIN areas ar
          ON ar.id = a.area_id
        JOIN event_registrations er
          ON er.event_id = ea.event_id
         AND er.account_id = $1
        ORDER BY
          ea.starts_at,
          a.name
      `,
      [req.auth!.sub],
    );

    res.json({
      event_activities: result.rows,
    });
  },
);

memberParticipationRouter.get(
  "/signups",
  async (req, res) => {
    const result =
      await query<ActivitySignup>(
        `
          SELECT
            eas.id,
            eas.event_activity_id,
            eas.member_attendee_id,
            ma.member_id,
            hm.full_name AS member_name,
            a.name AS activity_name,
            e.name AS event_name,
            ea.starts_at,
            ea.ends_at,
            eas.checked_in_at,
            eas.checked_out_at
          FROM event_activity_signups eas
          JOIN member_attendees ma
            ON ma.id = eas.member_attendee_id
          JOIN household_members hm
            ON hm.id = ma.member_id
          JOIN event_activities ea
            ON ea.id = eas.event_activity_id
          JOIN activities a
            ON a.id = ea.activity_id
          JOIN events e
            ON e.id = ea.event_id
          WHERE hm.account_id = $1
          ORDER BY ea.starts_at, hm.full_name
        `,
        [req.auth!.sub],
      );

    res.json({
      signups: result.rows,
    });
  },
);

memberParticipationRouter.post(
  "/signups",
  async (req, res) => {
    const parsed =
      createActivitySignupSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid activity signup",
      });
      return;
    }

    try {
      const attendeeResult =
        await query<{
          id: string;
        }>(
          `
            SELECT ma.id
            FROM member_attendees ma
            JOIN household_members hm
              ON hm.id = ma.member_id
            WHERE ma.id = $1
              AND hm.account_id = $2
            LIMIT 1
          `,
          [
            parsed.data
              .member_attendee_id,
            req.auth!.sub,
          ],
        );

      if (!attendeeResult.rows[0]) {
        res.status(403).json({
          error:
            "That attendee is not part of this household",
        });
        return;
      }

      const result =
        await query<ActivitySignup>(
          `
            WITH inserted AS (
              INSERT INTO event_activity_signups (
                event_activity_id,
                member_attendee_id
              )
              VALUES ($1, $2)
              RETURNING *
            )
            SELECT
              i.id,
              i.event_activity_id,
              i.member_attendee_id,
              ma.member_id,
              hm.full_name AS member_name,
              a.name AS activity_name,
              e.name AS event_name,
              ea.starts_at,
              ea.ends_at,
              i.checked_in_at,
              i.checked_out_at
            FROM inserted i
            JOIN member_attendees ma
              ON ma.id = i.member_attendee_id
            JOIN household_members hm
              ON hm.id = ma.member_id
            JOIN event_activities ea
              ON ea.id = i.event_activity_id
            JOIN activities a
              ON a.id = ea.activity_id
            JOIN events e
              ON e.id = ea.event_id
          `,
          [
            parsed.data
              .event_activity_id,
            parsed.data
              .member_attendee_id,
          ],
        );

      res.status(201).json({
        signup: result.rows[0],
      });
    } catch (error: any) {
      const message =
        String(error?.message ?? "");

      if (
        message.includes(
          "ACTIVITY_SIGNUP_EVENT_MISMATCH",
        )
      ) {
        res.status(409).json({
          error:
            "That attendee is not attending this event",
        });
        return;
      }

      if (
        message.includes(
          "ACTIVITY_SIGNUP_DUPLICATE",
        )
      ) {
        res.status(409).json({
          error:
            "That person is already signed up",
        });
        return;
      }

      if (
        message.includes(
          "ACTIVITY_TIME_CONFLICT",
        )
      ) {
        res.status(409).json({
          error:
            "That person already has another activity at this time",
        });
        return;
      }

      if (
        message.includes(
          "ACTIVITY_CAPACITY_FULL",
        )
      ) {
        res.status(409).json({
          error:
            "This activity is full",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not create activity signup",
      });
    }
  },
);

memberParticipationRouter.delete(
  "/signups/:id",
  async (req, res) => {
    const parsed =
      activitySignupIdParamsSchema.safeParse(
        req.params,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid signup id",
      });
      return;
    }

    const result = await query<{
      id: string;
    }>(
      `
        DELETE FROM event_activity_signups eas
        USING
          member_attendees ma,
          household_members hm
        WHERE eas.id = $1
          AND ma.id =
            eas.member_attendee_id
          AND hm.id = ma.member_id
          AND hm.account_id = $2
        RETURNING eas.id
      `,
      [
        parsed.data.id,
        req.auth!.sub,
      ],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Signup does not exist",
      });
      return;
    }

    res.json({ ok: true });
  },
);
