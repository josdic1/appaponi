import { Router } from "express";

import {
  createOwnHouseholdMemberSchema,
  householdMemberIdParamsSchema,
  memberHouseholdSetupSchema,
  updateHouseholdMemberSchema,
  updateOwnHouseholdSchema,
  type HouseholdMember,
} from "@appoponi/shared/schemas/householdMembers";

import {
  activitySignupIdParamsSchema,
  createActivitySignupSchema,
  createMemberAttendeeSchema,
  memberAttendeeIdParamsSchema,
  memberDirectoryQuerySchema,
  updateEventHouseholdLeadSchema,
  updateMemberDirectorySettingsSchema,
  type ActivitySignup,
  type MemberAttendee,
  type MemberDirectoryHousehold,
} from "@appoponi/shared/schemas/registration";

import { pool } from "../db/pool.js";
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
          hm.id,
          hm.account_id,
          a.username,
          a.display_name AS household_name,
          hm.full_name,
          hm.email,
          hm.phone,
          hm.dietary_restrictions,
          hm.member_role,
          hm.created_at,
          hm.updated_at
        FROM household_members hm
        JOIN accounts a
          ON a.id = hm.account_id
        WHERE hm.account_id = $1
        ORDER BY
          CASE hm.member_role
            WHEN 'primary' THEN 0
            WHEN 'adult' THEN 1
            ELSE 2
          END,
          hm.full_name,
          hm.id
      `,
      [req.auth!.sub],
    );

    res.json({
      household_members: result.rows,
    });
  },
);


memberParticipationRouter.get(
  "/directory",
  async (req, res) => {
    const parsed =
      memberDirectoryQuerySchema.safeParse(
        req.query,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid event id",
      });
      return;
    }

    const eventId = parsed.data.event_id;

    const ownRegistration = await query<{
      id: string;
    }>(
      `
        SELECT id
        FROM event_registrations
        WHERE event_id = $1
          AND account_id = $2
      `,
      [eventId, req.auth!.sub],
    );

    if (!ownRegistration.rows[0]) {
      res.status(403).json({
        error:
          "You are not registered for this event",
      });
      return;
    }

    const result =
      await query<MemberDirectoryHousehold>(
        `
          SELECT
            er.id::text AS registration_id,
            COALESCE(
              NULLIF(BTRIM(a.display_name), ''),
              a.username
            ) AS household_name,
            CASE
              WHEN er.account_id = $2
                OR er.share_cabin_publicly
              THEN c.name
              ELSE NULL
            END AS cabin_name,
            er.share_cabin_publicly AS cabin_shared,
            (er.account_id = $2) AS is_own_household,
            COALESCE(
              json_agg(
                json_build_object(
                  'attendee_id', ma.id::text,
                  'full_name', hm.full_name
                )
                ORDER BY
                  CASE hm.member_role
                    WHEN 'primary' THEN 0
                    WHEN 'adult' THEN 1
                    ELSE 2
                  END,
                  hm.full_name,
                  hm.id
              ) FILTER (WHERE ma.id IS NOT NULL),
              '[]'::json
            ) AS members
          FROM event_registrations er
          JOIN accounts a
            ON a.id = er.account_id
          LEFT JOIN cabins c
            ON c.id = er.cabin_id
          LEFT JOIN household_members hm
            ON hm.account_id = er.account_id
          LEFT JOIN member_attendees ma
            ON ma.event_id = er.event_id
           AND ma.member_id = hm.id
          WHERE er.event_id = $1
          GROUP BY
            er.id,
            er.account_id,
            a.display_name,
            a.username,
            c.name,
            er.share_cabin_publicly
          ORDER BY
            COALESCE(
              NULLIF(BTRIM(a.display_name), ''),
              a.username
            ),
            er.id
        `,
        [eventId, req.auth!.sub],
      );

    res.json({
      households: result.rows,
    });
  },
);

memberParticipationRouter.patch(
  "/directory",
  async (req, res) => {
    const parsed =
      updateMemberDirectorySettingsSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid directory settings",
      });
      return;
    }

    const result = await query<{
      share_cabin_publicly: boolean;
    }>(
      `
        UPDATE event_registrations
        SET share_cabin_publicly = $3
        WHERE event_id = $1
          AND account_id = $2
        RETURNING share_cabin_publicly
      `,
      [
        parsed.data.event_id,
        req.auth!.sub,
        parsed.data.share_cabin_publicly,
      ],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error:
          "Event registration does not exist",
      });
      return;
    }

    res.json({
      share_cabin_publicly:
        result.rows[0]
          .share_cabin_publicly,
    });
  },
);


memberParticipationRouter.patch(
  "/household-lead",
  async (req, res) => {
    const parsed =
      updateEventHouseholdLeadSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid household lead",
      });
      return;
    }

    try {
      const result = await query<{
        household_lead_member_id: string;
        household_lead_name: string;
      }>(
        `
          UPDATE event_registrations er
          SET household_lead_attendee_id = ma.id
          FROM member_attendees ma
          JOIN household_members hm
            ON hm.id = ma.member_id
          WHERE er.event_id = $1
            AND er.account_id = $2
            AND ma.event_id = er.event_id
            AND ma.member_id = $3
            AND hm.account_id = er.account_id
            AND hm.member_role IN ('primary', 'adult')
          RETURNING
            hm.id AS household_lead_member_id,
            hm.full_name AS household_lead_name
        `,
        [
          parsed.data.event_id,
          req.auth!.sub,
          parsed.data.member_id,
        ],
      );

      const lead = result.rows[0];

      if (!lead) {
        res.status(409).json({
          error:
            "Household lead must be an attending adult in this household",
        });
        return;
      }

      res.json({
        household_lead_member_id:
          lead.household_lead_member_id,
        household_lead_name:
          lead.household_lead_name,
      });
    } catch (error: any) {
      const message =
        String(error?.message ?? "");

      if (
        message.includes(
          "EVENT_HOUSEHOLD_LEAD_MISMATCH",
        ) ||
        message.includes(
          "EVENT_HOUSEHOLD_LEAD_ADULT_REQUIRED",
        )
      ) {
        res.status(409).json({
          error:
            "Household lead must be an attending adult in this household",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not update household lead",
      });
    }
  },
);


memberParticipationRouter.post(
  "/household/setup",
  async (req, res) => {
    const parsed =
      memberHouseholdSetupSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid household setup",
      });
      return;
    }

    const client =
      await pool.connect();

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

      const existing =
        await client.query<{
          count: string;
        }>(
          `
            SELECT COUNT(*)::text AS count
            FROM household_members
            WHERE account_id = $1
          `,
          [req.auth!.sub],
        );

      if (
        Number(
          existing.rows[0]?.count ??
            "0",
        ) > 0
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(409).json({
          error:
            "Household setup is already complete",
        });
        return;
      }

      await client.query(
        `
          UPDATE accounts
          SET display_name = $2
          WHERE id = $1
            AND account_type = 'member'
        `,
        [
          req.auth!.sub,
          parsed.data.household_name,
        ],
      );

      const result =
        await client.query<HouseholdMember>(
          `
            WITH inserted AS (
              INSERT INTO household_members (
                account_id,
                full_name,
                email,
                phone,
                dietary_restrictions,
                member_role
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'primary'
              )
              RETURNING *
            )
            SELECT
              i.id,
              i.account_id,
              a.username,
              a.display_name AS household_name,
              i.full_name,
              i.email,
              i.phone,
              i.dietary_restrictions,
              i.member_role,
              i.created_at,
              i.updated_at
            FROM inserted i
            JOIN accounts a
              ON a.id = i.account_id
          `,
          [
            req.auth!.sub,
            parsed.data.full_name,
            parsed.data.email ?? null,
            parsed.data.phone ?? null,
            parsed.data
              .dietary_restrictions ??
              null,
          ],
        );

      await client.query("COMMIT");

      res.status(201).json({
        household_member:
          result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);

      res.status(500).json({
        error:
          "Could not set up household",
      });
    } finally {
      client.release();
    }
  },
);

memberParticipationRouter.patch(
  "/household",
  async (req, res) => {
    const parsed =
      updateOwnHouseholdSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid household name",
      });
      return;
    }

    const result = await query<{
      display_name: string;
    }>(
      `
        UPDATE accounts
        SET display_name = $2
        WHERE id = $1
          AND account_type = 'member'
        RETURNING display_name
      `,
      [
        req.auth!.sub,
        parsed.data.household_name,
      ],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error:
          "Member account does not exist",
      });
      return;
    }

    res.json({
      household_name:
        result.rows[0].display_name,
    });
  },
);

memberParticipationRouter.post(
  "/household",
  async (req, res) => {
    const parsed =
      createOwnHouseholdMemberSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid household member",
      });
      return;
    }

    try {
      const existing =
        await query<{
          count: string;
        }>(
          `
            SELECT COUNT(*)::text AS count
            FROM household_members
            WHERE account_id = $1
          `,
          [req.auth!.sub],
        );

      if (
        Number(
          existing.rows[0]?.count ??
            "0",
        ) === 0
      ) {
        res.status(409).json({
          error:
            "Complete household setup first",
        });
        return;
      }

      const result =
        await query<HouseholdMember>(
          `
            WITH inserted AS (
              INSERT INTO household_members (
                account_id,
                full_name,
                email,
                phone,
                dietary_restrictions,
                member_role
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
              )
              RETURNING *
            )
            SELECT
              i.id,
              i.account_id,
              a.username,
              a.display_name AS household_name,
              i.full_name,
              i.email,
              i.phone,
              i.dietary_restrictions,
              i.member_role,
              i.created_at,
              i.updated_at
            FROM inserted i
            JOIN accounts a
              ON a.id = i.account_id
          `,
          [
            req.auth!.sub,
            parsed.data.full_name,
            parsed.data.email ?? null,
            parsed.data.phone ?? null,
            parsed.data
              .dietary_restrictions ??
              null,
            parsed.data.member_role,
          ],
        );

      res.status(201).json({
        household_member:
          result.rows[0],
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not add household member",
      });
    }
  },
);

memberParticipationRouter.patch(
  "/household/:id",
  async (req, res) => {
    const params =
      householdMemberIdParamsSchema.safeParse(
        req.params,
      );

    const body =
      updateHouseholdMemberSchema.safeParse(
        req.body,
      );

    if (
      !params.success ||
      !body.success
    ) {
      res.status(400).json({
        error:
          "Invalid household member update",
      });
      return;
    }

    const result =
      await query<HouseholdMember>(
        `
          WITH updated AS (
            UPDATE household_members
            SET
              full_name =
                COALESCE(
                  $3,
                  full_name
                ),
              email =
                CASE
                  WHEN $4
                  THEN $5
                  ELSE email
                END,
              phone =
                CASE
                  WHEN $6
                  THEN $7
                  ELSE phone
                END,
              dietary_restrictions =
                CASE
                  WHEN $8
                  THEN $9
                  ELSE dietary_restrictions
                END
            WHERE id = $1
              AND account_id = $2
            RETURNING *
          )
          SELECT
            u.id,
            u.account_id,
            a.username,
            a.display_name AS household_name,
            u.full_name,
            u.email,
            u.phone,
            u.dietary_restrictions,
            u.member_role,
            u.created_at,
            u.updated_at
          FROM updated u
          JOIN accounts a
            ON a.id = u.account_id
        `,
        [
          params.data.id,
          req.auth!.sub,
          body.data.full_name ??
            null,
          Object.prototype
            .hasOwnProperty.call(
              body.data,
              "email",
            ),
          body.data.email ?? null,
          Object.prototype
            .hasOwnProperty.call(
              body.data,
              "phone",
            ),
          body.data.phone ?? null,
          Object.prototype
            .hasOwnProperty.call(
              body.data,
              "dietary_restrictions",
            ),
          body.data
            .dietary_restrictions ??
            null,
        ],
      );

    const member =
      result.rows[0];

    if (!member) {
      res.status(404).json({
        error:
          "Household member does not exist",
      });
      return;
    }

    res.json({
      household_member: member,
    });
  },
);

memberParticipationRouter.post(
  "/household/:id/make-primary",
  async (req, res) => {
    const parsed =
      householdMemberIdParamsSchema.safeParse(
        req.params,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid household member id",
      });
      return;
    }

    const client =
      await pool.connect();

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

      const target =
        await client.query<{
          id: string;
          full_name: string;
          member_role:
            | "primary"
            | "adult"
            | "child";
        }>(
          `
            SELECT
              id,
              full_name,
              member_role
            FROM household_members
            WHERE id = $1
              AND account_id = $2
            FOR UPDATE
          `,
          [
            parsed.data.id,
            req.auth!.sub,
          ],
        );

      const person =
        target.rows[0];

      if (!person) {
        await client.query(
          "ROLLBACK",
        );

        res.status(404).json({
          error:
            "Household member does not exist",
        });
        return;
      }

      if (
        person.member_role ===
        "child"
      ) {
        await client.query(
          "ROLLBACK",
        );

        res.status(409).json({
          error:
            "A child cannot be the default household lead",
        });
        return;
      }

      if (
        person.member_role ===
        "primary"
      ) {
        await client.query(
          "COMMIT",
        );

        res.json({
          ok: true,
          primary_member_id:
            person.id,
        });
        return;
      }

      const result =
        await client.query<{
          id: string;
        }>(
          `
            UPDATE household_members
            SET member_role =
              CASE
                WHEN id = $1
                THEN 'primary'
                ELSE 'adult'
              END
            WHERE account_id = $2
              AND (
                id = $1
                OR member_role =
                  'primary'
              )
            RETURNING id
          `,
          [
            person.id,
            req.auth!.sub,
          ],
        );

      if (
        result.rows.length < 2
      ) {
        throw new Error(
          "Household must have an existing default lead",
        );
      }

      await client.query("COMMIT");

      res.json({
        ok: true,
        primary_member_id:
          person.id,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);

      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Could not change default household lead",
      });
    } finally {
      client.release();
    }
  },
);

memberParticipationRouter.delete(
  "/household/:id",
  async (req, res) => {
    const parsed =
      householdMemberIdParamsSchema.safeParse(
        req.params,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid household member id",
      });
      return;
    }

    try {
      const result =
        await query<{
          id: string;
        }>(
          `
            DELETE FROM household_members
            WHERE id = $1
              AND account_id = $2
              AND member_role <> 'primary'
            RETURNING id
          `,
          [
            parsed.data.id,
            req.auth!.sub,
          ],
        );

      if (!result.rows[0]) {
        res.status(409).json({
          error:
            "The default household lead cannot be deleted here",
        });
        return;
      }

      res.json({
        ok: true,
        deleted_household_member_id:
          result.rows[0].id,
      });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error:
            "Remove this person's event records first",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not delete household member",
      });
    }
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

      if (attendee.member_role !== "child") {
        await query(
          `
            UPDATE event_registrations
            SET household_lead_attendee_id = $1
            WHERE event_id = $2
              AND account_id = $3
              AND household_lead_attendee_id IS NULL
          `,
          [
            attendee.id,
            attendee.event_id,
            req.auth!.sub,
          ],
        );
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
        event_id: string;
      }>(
        `
          DELETE FROM member_attendees ma
          USING household_members hm
          WHERE ma.id = $1
            AND hm.id = ma.member_id
            AND hm.account_id = $2
          RETURNING ma.id, ma.event_id
        `,
        [
          parsed.data.id,
          req.auth!.sub,
        ],
      );

      const removed = result.rows[0];

      if (!removed) {
        res.status(404).json({
          error:
            "Attendee does not exist",
        });
        return;
      }

      const replacement = await query<{
        attendee_id: string;
      }>(
        `
          SELECT ma.id AS attendee_id
          FROM member_attendees ma
          JOIN household_members hm
            ON hm.id = ma.member_id
          WHERE ma.event_id = $1
            AND hm.account_id = $2
            AND hm.member_role IN ('primary', 'adult')
          ORDER BY
            CASE hm.member_role
              WHEN 'primary' THEN 0
              ELSE 1
            END,
            hm.id
          LIMIT 1
        `,
        [
          removed.event_id,
          req.auth!.sub,
        ],
      );

      if (replacement.rows[0]) {
        await query(
          `
            UPDATE event_registrations
            SET household_lead_attendee_id = $3
            WHERE event_id = $1
              AND account_id = $2
              AND household_lead_attendee_id IS NULL
          `,
          [
            removed.event_id,
            req.auth!.sub,
            replacement.rows[0].attendee_id,
          ],
        );
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
          a.map_place_id,
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
            eas.checked_in_at
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
              i.checked_in_at
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
