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
        await query<EventRegistration>(
          `
            SELECT
              er.id,
              er.account_id,
              a.username,
              a.display_name AS household_name,
              er.event_id,
              e.name AS event_name,
              e.starts_at AS event_starts_at,
              e.ends_at AS event_ends_at,
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
              c.map_slot_id AS cabin_map_slot_id,
              er.share_cabin_publicly,
              lead_member.id AS household_lead_member_id,
              lead_member.full_name AS household_lead_name
            FROM event_registrations er
            JOIN accounts a
              ON a.id = er.account_id
            JOIN events e
              ON e.id = er.event_id
            LEFT JOIN cabins c
              ON c.id = er.cabin_id
            LEFT JOIN member_attendees lead_attendee
              ON lead_attendee.id = er.household_lead_attendee_id
            LEFT JOIN household_members lead_member
              ON lead_member.id = lead_attendee.member_id
            WHERE (
              $1::boolean = TRUE
              OR er.account_id = $2
            )
              AND (
                $3::bigint IS NULL
                OR er.event_id = $3
              )
            ORDER BY
              e.starts_at,
              COALESCE(
                a.display_name,
                a.username
              )
          `,
          [
            isAdmin,
            req.auth!.sub,
            eventId,
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

registrationsRouter.get(
  "/:id/overview",
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
  async (req, res) => {
    const params =
      registrationIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error:
          "Invalid registration id",
      });
      return;
    }

    try {
      const registrationResult =
        await query<EventRegistration>(
          `
            SELECT
              er.id,
              er.account_id,
              a.username,
              a.display_name AS household_name,
              er.event_id,
              e.name AS event_name,
              e.starts_at AS event_starts_at,
              e.ends_at AS event_ends_at,
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
              c.map_slot_id AS cabin_map_slot_id,
              er.share_cabin_publicly,
              lead_member.id AS household_lead_member_id,
              lead_member.full_name AS household_lead_name
            FROM event_registrations er
            JOIN accounts a
              ON a.id = er.account_id
            JOIN events e
              ON e.id = er.event_id
            LEFT JOIN cabins c
              ON c.id = er.cabin_id
            LEFT JOIN member_attendees lead_attendee
              ON lead_attendee.id = er.household_lead_attendee_id
            LEFT JOIN household_members lead_member
              ON lead_member.id = lead_attendee.member_id
            WHERE er.id = $1
          `,
          [params.data.id],
        );

      const registration =
        registrationResult.rows[0];

      if (!registration) {
        res.status(404).json({
          error:
            "Registration does not exist",
        });
        return;
      }

      const members =
        await query<{
          id: string;
          full_name: string;
          member_role:
            | "primary"
            | "adult"
            | "child";
          email: string | null;
          phone: string | null;
          dietary_restrictions:
            | string
            | null;
          attendee_id:
            | string
            | null;
          attending: boolean;
        }>(
          `
            SELECT
              hm.id,
              hm.full_name,
              hm.member_role,
              hm.email,
              hm.phone,
              hm.dietary_restrictions,
              ma.id AS attendee_id,
              (ma.id IS NOT NULL) AS attending
            FROM event_registrations er
            JOIN household_members hm
              ON hm.account_id = er.account_id
            LEFT JOIN member_attendees ma
              ON ma.member_id = hm.id
             AND ma.event_id = er.event_id
            WHERE er.id = $1
            ORDER BY
              CASE hm.member_role
                WHEN 'primary' THEN 0
                WHEN 'adult' THEN 1
                ELSE 2
              END,
              hm.full_name,
              hm.id
          `,
          [params.data.id],
        );

      const signups =
        await query<{
          id: string;
          event_activity_id: string;
          member_attendee_id: string;
          member_id: string;
          member_name: string;
          activity_name: string;
          area_name: string;
          starts_at: string;
          ends_at: string;
          checked_in_at:
            | string
            | null;
        }>(
          `
            SELECT
              eas.id,
              eas.event_activity_id,
              eas.member_attendee_id,
              ma.member_id,
              hm.full_name AS member_name,
              activity.name AS activity_name,
              area.name AS area_name,
              ea.starts_at,
              ea.ends_at,
              eas.checked_in_at
            FROM event_registrations er
            JOIN household_members hm
              ON hm.account_id = er.account_id
            JOIN member_attendees ma
              ON ma.member_id = hm.id
             AND ma.event_id = er.event_id
            JOIN event_activity_signups eas
              ON eas.member_attendee_id = ma.id
            JOIN event_activities ea
              ON ea.id = eas.event_activity_id
             AND ea.event_id = er.event_id
            JOIN activities activity
              ON activity.id = ea.activity_id
            JOIN areas area
              ON area.id = activity.area_id
            WHERE er.id = $1
            ORDER BY
              ea.starts_at,
              activity.name,
              hm.full_name
          `,
          [params.data.id],
        );

      res.json({
        overview: {
          registration,
          members: members.rows,
          signups: signups.rows,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load household overview",
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
              a.display_name AS household_name,
              i.event_id,
              e.name AS event_name,
              i.spots_paid_for,
              0::int AS selected_attendees,
              i.cabin_id,
              c.name AS cabin_name,
              c.map_slot_id AS cabin_map_slot_id,
              i.share_cabin_publicly,
              lead_member.id AS household_lead_member_id,
              lead_member.full_name AS household_lead_name
            FROM inserted i
            JOIN accounts a
              ON a.id = i.account_id
            JOIN events e
              ON e.id = i.event_id
            LEFT JOIN cabins c
              ON c.id = i.cabin_id
            LEFT JOIN member_attendees lead_attendee
              ON lead_attendee.id = i.household_lead_attendee_id
            LEFT JOIN household_members lead_member
              ON lead_member.id = lead_attendee.member_id
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
  "/cabins/bulk",
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
  async (req, res) => {
    const rawAssignments =
      Array.isArray(req.body?.assignments)
        ? req.body.assignments
        : null;

    if (
      !rawAssignments ||
      rawAssignments.length < 1 ||
      rawAssignments.length > 100
    ) {
      res.status(400).json({
        error:
          "Invalid bulk cabin assignments",
      });
      return;
    }

    const assignments: Array<{
      registration_id: number;
      cabin_id: number | null;
    }> =
      rawAssignments.map(
        (item: any) => ({
          registration_id:
            Number(
              item?.registration_id,
            ),
          cabin_id:
            item?.cabin_id === null
              ? null
              : Number(
                  item?.cabin_id,
                ),
        }),
      );

    if (
      assignments.some(
        (item) =>
          !Number.isInteger(
            item.registration_id,
          ) ||
          item.registration_id <= 0 ||
          (
            item.cabin_id !== null &&
            (
              !Number.isInteger(
                item.cabin_id,
              ) ||
              item.cabin_id <= 0
            )
          ),
      )
    ) {
      res.status(400).json({
        error:
          "Invalid bulk cabin assignments",
      });
      return;
    }

    const registrationIds =
      assignments.map(
        (item) =>
          item.registration_id,
      );

    if (
      new Set(
        registrationIds,
      ).size !==
      registrationIds.length
    ) {
      res.status(400).json({
        error:
          "Each household can appear only once in a bulk cabin update",
      });
      return;
    }

    const targetCabinIds =
      assignments
        .map(
          (item) =>
            item.cabin_id,
        )
        .filter(
          (
            id,
          ): id is number =>
            id !== null,
        );

    if (
      new Set(
        targetCabinIds,
      ).size !==
      targetCabinIds.length
    ) {
      res.status(409).json({
        error:
          "Two households cannot be moved into the same cabin",
      });
      return;
    }

    try {
      const registrations =
        await query<{
          id: string;
        }>(
          `
            SELECT id
            FROM event_registrations
            WHERE id = ANY(
              $1::bigint[]
            )
          `,
          [
            registrationIds,
          ],
        );

      if (
        registrations.rows.length !==
        assignments.length
      ) {
        res.status(404).json({
          error:
            "One or more registrations do not exist",
        });
        return;
      }

      if (
        targetCabinIds.length
      ) {
        const targetCabins =
          await query<{
            id: string;
          }>(
            `
              SELECT id
              FROM cabins
              WHERE id = ANY(
                $1::bigint[]
              )
            `,
            [
              targetCabinIds,
            ],
          );

        if (
          targetCabins.rows.length !==
          targetCabinIds.length
        ) {
          res.status(404).json({
            error:
              "One or more cabins do not exist",
          });
          return;
        }

        const conflict =
          await query<{
            household_name: string;
            cabin_name: string;
            event_name: string;
          }>(
            `
              WITH input AS (
                SELECT
                  (
                    item ->>
                    'registration_id'
                  )::bigint
                    AS registration_id,
                  (
                    item ->>
                    'cabin_id'
                  )::bigint
                    AS cabin_id
                FROM jsonb_array_elements(
                  $1::jsonb
                ) AS item
                WHERE
                  item ->>
                  'cabin_id'
                  IS NOT NULL
              )
              SELECT
                COALESCE(
                  other_account.display_name,
                  other_account.username
                ) AS household_name,
                cabin.name
                  AS cabin_name,
                other_event.name
                  AS event_name
              FROM input
              JOIN event_registrations target
                ON target.id =
                  input.registration_id
              JOIN events target_event
                ON target_event.id =
                  target.event_id
              JOIN cabins cabin
                ON cabin.id =
                  input.cabin_id
              JOIN event_registrations other
                ON other.cabin_id =
                  input.cabin_id
               AND other.id <>
                  target.id
              JOIN events other_event
                ON other_event.id =
                  other.event_id
              JOIN accounts other_account
                ON other_account.id =
                  other.account_id
              WHERE
                target_event.starts_at <
                  other_event.ends_at
                AND
                other_event.starts_at <
                  target_event.ends_at
              LIMIT 1
            `,
            [
              JSON.stringify(
                assignments,
              ),
            ],
          );

        if (conflict.rows[0]) {
          res.status(409).json({
            error:
              `${conflict.rows[0].cabin_name} is occupied by ${conflict.rows[0].household_name} during ${conflict.rows[0].event_name}`,
          });
          return;
        }
      }

      const values: unknown[] = [];
      const valueRows =
        assignments.map(
          (item, index) => {
            const offset =
              index * 2;

            values.push(
              item.registration_id,
              item.cabin_id,
            );

            return `(
              $${offset + 1}::bigint,
              $${offset + 2}::bigint
            )`;
          },
        );

      const result =
        await query<{
          id: string;
        }>(
          `
            UPDATE event_registrations
            SET cabin_id =
              input.cabin_id
            FROM (
              VALUES
                ${valueRows.join(",")}
            ) AS input(
              registration_id,
              cabin_id
            )
            WHERE
              event_registrations.id =
                input.registration_id
            RETURNING
              event_registrations.id
          `,
          values,
        );

      res.json({
        updated_count:
          result.rows.length,
      });
    } catch (error: any) {
      if (
        error?.code ===
          "P0001" &&
        String(
          error?.message ?? "",
        ).includes(
          "CABIN_OCCUPIED",
        )
      ) {
        res.status(409).json({
          error:
            "A selected cabin became occupied before the changes were applied",
        });
        return;
      }

      console.error(error);

      res.status(500).json({
        error:
          "Could not apply cabin changes",
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
      if (body.data.cabin_id !== null) {
        const conflict = await query<{
          household_name: string;
          event_name: string;
        }>(
          `
            SELECT
              COALESCE(
                other_account.display_name,
                other_account.username
              ) AS household_name,
              other_event.name AS event_name
            FROM event_registrations target
            JOIN events target_event
              ON target_event.id = target.event_id
            JOIN event_registrations other
              ON other.cabin_id = $2
             AND other.id <> target.id
            JOIN events other_event
              ON other_event.id = other.event_id
            JOIN accounts other_account
              ON other_account.id = other.account_id
            WHERE target.id = $1
              AND target_event.starts_at < other_event.ends_at
              AND other_event.starts_at < target_event.ends_at
            LIMIT 1
          `,
          [
            params.data.id,
            body.data.cabin_id,
          ],
        );

        if (conflict.rows[0]) {
          res.status(409).json({
            error:
              `Cabin is occupied by ${conflict.rows[0].household_name} during ${conflict.rows[0].event_name}`,
          });
          return;
        }
      }

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

      if (
        error?.code === "P0001" &&
        String(error?.message ?? "").includes(
          "CABIN_OCCUPIED",
        )
      ) {
        res.status(409).json({
          error:
            "Cabin is occupied during this event",
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
