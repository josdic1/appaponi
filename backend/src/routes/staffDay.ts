import { Router } from "express";

import {
  staffSignupIdParamsSchema,
  type StaffParticipant,
  type StaffScheduledActivity,
} from "@appoponi/shared/schemas/staffDay";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const staffDayRouter = Router();

staffDayRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("staff", "admin"),
);

staffDayRouter.get(
  "/activities",
  async (req, res) => {
    try {
      const isAdmin =
        req.auth!.account_type === "admin";

      const result =
        await query<StaffScheduledActivity>(
          `
            SELECT DISTINCT
              ea.id,
              e.name AS event_name,
              a.name AS activity_name,
              ar.name AS area_name,
              ea.starts_at,
              ea.ends_at
            FROM event_activities ea
            JOIN events e
              ON e.id = ea.event_id
            JOIN activities a
              ON a.id = ea.activity_id
            JOIN areas ar
              ON ar.id = a.area_id
            LEFT JOIN event_activity_staff eas
              ON eas.event_activity_id = ea.id
            LEFT JOIN staff_members sm
              ON sm.id = eas.staff_member_id
            WHERE (
              $1::boolean = TRUE
              OR sm.account_id = $2
            )
            ORDER BY ea.starts_at, a.name
          `,
          [
            isAdmin,
            req.auth!.sub,
          ],
        );

      res.json({
        activities: result.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load staff schedule",
      });
    }
  },
);

staffDayRouter.get(
  "/participants",
  async (req, res) => {
    try {
      const isAdmin =
        req.auth!.account_type === "admin";

      const result =
        await query<StaffParticipant>(
          `
            SELECT DISTINCT
              easign.id AS signup_id,
              easign.event_activity_id,
              hm.full_name AS member_name,
              easign.checked_in_at,
              easign.checked_out_at
            FROM event_activity_signups easign
            JOIN member_attendees ma
              ON ma.id =
                easign.member_attendee_id
            JOIN household_members hm
              ON hm.id = ma.member_id
            LEFT JOIN event_activity_staff eastaff
              ON eastaff.event_activity_id =
                easign.event_activity_id
            LEFT JOIN staff_members sm
              ON sm.id =
                eastaff.staff_member_id
            WHERE (
              $1::boolean = TRUE
              OR sm.account_id = $2
            )
            ORDER BY
              easign.event_activity_id,
              hm.full_name
          `,
          [
            isAdmin,
            req.auth!.sub,
          ],
        );

      res.json({
        participants: result.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load activity participants",
      });
    }
  },
);

async function canManageSignup(
  signupId: number,
  accountId: string,
  isAdmin: boolean,
): Promise<boolean> {
  const result = await query<{ allowed: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM event_activity_signups easign
        LEFT JOIN event_activity_staff eastaff
          ON eastaff.event_activity_id =
            easign.event_activity_id
        LEFT JOIN staff_members sm
          ON sm.id = eastaff.staff_member_id
        WHERE easign.id = $1
          AND (
            $2::boolean = TRUE
            OR sm.account_id = $3
          )
      ) AS allowed
    `,
    [
      signupId,
      isAdmin,
      accountId,
    ],
  );

  return Boolean(
    result.rows[0]?.allowed,
  );
}

staffDayRouter.post(
  "/signups/:id/check-in",
  async (req, res) => {
    const parsed =
      staffSignupIdParamsSchema.safeParse(
        req.params,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid signup id",
      });
      return;
    }

    const allowed =
      await canManageSignup(
        parsed.data.id,
        req.auth!.sub,
        req.auth!.account_type ===
          "admin",
      );

    if (!allowed) {
      res.status(403).json({
        error:
          "You are not assigned to this activity",
      });
      return;
    }

    const result = await query<{
      id: string;
      checked_in_at: string;
    }>(
      `
        UPDATE event_activity_signups
        SET
          checked_in_at =
            COALESCE(
              checked_in_at,
              NOW()
            ),
          checked_out_at = NULL
        WHERE id = $1
        RETURNING
          id,
          checked_in_at
      `,
      [parsed.data.id],
    );

    res.json({
      signup: result.rows[0],
    });
  },
);

staffDayRouter.post(
  "/signups/:id/check-out",
  async (req, res) => {
    const parsed =
      staffSignupIdParamsSchema.safeParse(
        req.params,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid signup id",
      });
      return;
    }

    const allowed =
      await canManageSignup(
        parsed.data.id,
        req.auth!.sub,
        req.auth!.account_type ===
          "admin",
      );

    if (!allowed) {
      res.status(403).json({
        error:
          "You are not assigned to this activity",
      });
      return;
    }

    try {
      const result = await query<{
        id: string;
        checked_out_at: string;
      }>(
        `
          UPDATE event_activity_signups
          SET checked_out_at = NOW()
          WHERE id = $1
            AND checked_in_at IS NOT NULL
          RETURNING
            id,
            checked_out_at
        `,
        [parsed.data.id],
      );

      if (!result.rows[0]) {
        res.status(409).json({
          error:
            "Participant must be checked in first",
        });
        return;
      }

      res.json({
        signup: result.rows[0],
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not check participant out",
      });
    }
  },
);
