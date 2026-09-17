import { Router } from "express";

import {
  cloneEventSchema,
  createEventSchema,
  eventIdParamsSchema,
  updateEventSchema,
  type EventHqRegistration,
  type EventHqScheduleItem,
  type EventHqSummary,
  type EventRecord,
} from "@appoponi/shared/schemas/events";

import { pool } from "../db/pool.js";
import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const eventsRouter = Router();

eventsRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

const eventSelect = `
  SELECT
    e.id,
    e.name,
    e.event_type_id,
    et.name AS event_type_name,
    e.starts_at,
    e.ends_at,
    e.booked_at,
    eto.value AS other_value,
    eto.reason AS other_reason,
    e.meal_menu_id,
    mm.name AS meal_menu_name,
    e.created_at,
    e.updated_at
  FROM events e
  JOIN event_types et
    ON et.id = e.event_type_id
  LEFT JOIN event_type_others eto
    ON eto.event_id = e.id
  LEFT JOIN meal_menus mm
    ON mm.id = e.meal_menu_id
`;

eventsRouter.get("/", async (_req, res) => {
  try {
    const result = await query<EventRecord>(
      `
        ${eventSelect}
        ORDER BY e.starts_at, e.name, e.id
      `,
    );

    res.json({
      events: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not load events",
    });
  }
});


eventsRouter.get("/:id/hq", async (req, res) => {
  const parsed =
    eventIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid event id",
    });
    return;
  }

  try {
    const eventResult =
      await query<EventRecord>(
        `
          ${eventSelect}
          WHERE e.id = $1
        `,
        [parsed.data.id],
      );

    const event = eventResult.rows[0];

    if (!event) {
      res.status(404).json({
        error: "Event does not exist",
      });
      return;
    }

    const [
      registrationsResult,
      activitiesResult,
      mealsResult,
      babysittingResult,
      ordersResult,
      noticesResult,
    ] = await Promise.all([
      query<EventHqRegistration>(
        `
          SELECT
            er.id,
            COALESCE(
              a.display_name,
              a.username
            ) AS household_name,
            er.spots_paid_for,
            COUNT(
              DISTINCT ma.id
            )::int AS attendee_count,
            c.name AS cabin_name
          FROM event_registrations er
          JOIN accounts a
            ON a.id = er.account_id
          LEFT JOIN household_members hm
            ON hm.account_id = er.account_id
          LEFT JOIN member_attendees ma
            ON ma.member_id = hm.id
           AND ma.event_id = er.event_id
          LEFT JOIN cabins c
            ON c.id = er.cabin_id
          WHERE er.event_id = $1
          GROUP BY
            er.id,
            a.display_name,
            a.username,
            c.name
          ORDER BY
            COALESCE(
              a.display_name,
              a.username
            )
        `,
        [parsed.data.id],
      ),
      query<EventHqScheduleItem>(
        `
          SELECT
            ea.id,
            'activity'::text AS kind,
            act.name AS title,
            ar.name AS meta,
            ea.starts_at,
            ea.ends_at,
            COUNT(
              DISTINCT eas.id
            )::int AS signup_count,
            COALESCE(
              ARRAY_AGG(
                DISTINCT sm.full_name
                ORDER BY sm.full_name
              ) FILTER (
                WHERE sm.id IS NOT NULL
              ),
              ARRAY[]::text[]
            ) AS staff_names,
            NULL::int AS food_item_count
          FROM event_activities ea
          JOIN activities act
            ON act.id = ea.activity_id
          JOIN areas ar
            ON ar.id = act.area_id
          LEFT JOIN event_activity_signups eas
            ON eas.event_activity_id = ea.id
          LEFT JOIN event_activity_staff easf
            ON easf.event_activity_id = ea.id
          LEFT JOIN staff_members sm
            ON sm.id = easf.staff_member_id
          WHERE ea.event_id = $1
          GROUP BY
            ea.id,
            act.name,
            ar.name,
            ea.starts_at,
            ea.ends_at
          ORDER BY
            ea.starts_at,
            act.name
        `,
        [parsed.data.id],
      ),
      query<EventHqScheduleItem>(
        `
          SELECT
            em.id,
            'meal'::text AS kind,
            COALESCE(
              em.title,
              mt.name
            ) AS title,
            mt.name AS meta,
            em.starts_at,
            em.ends_at,
            NULL::int AS signup_count,
            ARRAY[]::text[] AS staff_names,
            (
              CASE
                WHEN em.composition_mode = 'CUSTOM' THEN (
                  SELECT COUNT(*)
                  FROM event_meal_items emi
                  WHERE emi.event_meal_id = em.id
                )
                ELSE (
                  SELECT COUNT(*)
                  FROM meal_menu_items mmi
                  WHERE mmi.menu_id = e.meal_menu_id
                    AND (
                      mmi.day_of_week IS NULL
                      OR mmi.day_of_week = EXTRACT(
                        DOW FROM em.starts_at AT TIME ZONE 'America/New_York'
                      )::int
                    )
                    AND (
                      mmi.meal_type_id IS NULL
                      OR mmi.meal_type_id = em.meal_type_id
                    )
                )
              END
            )::int AS food_item_count
          FROM event_meals em
          JOIN meal_types mt
            ON mt.id = em.meal_type_id
          JOIN events e
            ON e.id = em.event_id
          WHERE em.event_id = $1
          ORDER BY
            em.starts_at,
            mt.name
        `,
        [parsed.data.id],
      ),
      query<{
        active_count: number;
        pending_count: number;
      }>(
        `
          SELECT
            COUNT(*) FILTER (
              WHERE br.status IN (
                'pending',
                'confirmed'
              )
            )::int AS active_count,
            COUNT(*) FILTER (
              WHERE br.status = 'pending'
            )::int AS pending_count
          FROM babysitting_requests br
          JOIN event_registrations er
            ON er.id =
              br.event_registration_id
          WHERE er.event_id = $1
        `,
        [parsed.data.id],
      ),
      query<{ count: number }>(
        `
          SELECT
            COUNT(*)::int AS count
          FROM food_orders aho
          JOIN event_registrations er
            ON er.id =
              aho.event_registration_id
          WHERE er.event_id = $1
            AND aho.status = 'open'
        `,
        [parsed.data.id],
      ),
      query<{ count: number }>(
        `
          SELECT
            COUNT(*)::int AS count
          FROM notifications
          WHERE event_id = $1
            AND read_at IS NULL
        `,
        [parsed.data.id],
      ),
    ]);

    const registrations =
      registrationsResult.rows;

    const schedule = [
      ...activitiesResult.rows,
      ...mealsResult.rows,
    ].sort(
      (left, right) =>
        new Date(
          left.starts_at,
        ).getTime() -
        new Date(
          right.starts_at,
        ).getTime(),
    );

    const activities =
      activitiesResult.rows;

    const meals =
      mealsResult.rows;

    const metrics = {
      households:
        registrations.length,
      people:
        registrations.reduce(
          (sum, row) =>
            sum +
            row.attendee_count,
          0,
        ),
      paid_spots:
        registrations.reduce(
          (sum, row) =>
            sum +
            row.spots_paid_for,
          0,
        ),
      cabins_assigned:
        registrations.filter(
          (row) =>
            Boolean(
              row.cabin_name,
            ),
        ).length,
      activities:
        activities.length,
      signups:
        activities.reduce(
          (sum, row) =>
            sum +
            (
              row.signup_count ??
              0
            ),
          0,
        ),
      unstaffed_activities:
        activities.filter(
          (row) =>
            row.staff_names.length ===
            0,
        ).length,
      meals:
        meals.length,
      food_services_unready:
        meals.filter(
          (row) =>
            (row.food_item_count ?? 0) === 0,
        ).length,
      active_babysitting:
        babysittingResult.rows[0]
          ?.active_count ?? 0,
      pending_babysitting:
        babysittingResult.rows[0]
          ?.pending_count ?? 0,
      open_orders:
        ordersResult.rows[0]
          ?.count ?? 0,
      unread_notices:
        noticesResult.rows[0]
          ?.count ?? 0,
    };

    const summary: EventHqSummary = {
      event,
      metrics,
      registrations,
      schedule,
    };

    res.json({
      hq: summary,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "Could not load Event HQ",
    });
  }
});

eventsRouter.post("/", async (req, res) => {
  const parsed =
    createEventSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid event",
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

    const typeResult = await client.query<{
      name: string;
    }>(
      `
        SELECT name
        FROM event_types
        WHERE id = $1
        LIMIT 1
      `,
      [parsed.data.event_type_id],
    );

    const eventType =
      typeResult.rows[0];

    if (!eventType) {
      await client.query("ROLLBACK");

      res.status(400).json({
        error: "Event type does not exist",
      });
      return;
    }

    const duplicateResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM events
        WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
          AND starts_at = $2
          AND ends_at = $3
        LIMIT 1
      `,
      [
        parsed.data.name,
        parsed.data.starts_at,
        parsed.data.ends_at,
      ],
    );

    if (duplicateResult.rows[0]) {
      await client.query("ROLLBACK");

      res.status(409).json({
        error: "An event with this name and timing already exists",
      });
      return;
    }

    if (
      eventType.name === "Other" &&
      (
        !parsed.data.other_value ||
        !parsed.data.other_reason
      )
    ) {
      await client.query("ROLLBACK");

      res.status(400).json({
        error:
          "Other event type requires a name and reason",
      });
      return;
    }

    const inserted =
      await client.query<{ id: string }>(
        `
          INSERT INTO events (
            name,
            event_type_id,
            starts_at,
            ends_at
          )
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `,
        [
          parsed.data.name,
          parsed.data.event_type_id,
          parsed.data.starts_at,
          parsed.data.ends_at,
        ],
      );

    const eventId =
      inserted.rows[0].id;

    if (eventType.name === "Other") {
      await client.query(
        `
          INSERT INTO event_type_others (
            event_id,
            value,
            reason
          )
          VALUES ($1, $2, $3)
        `,
        [
          eventId,
          parsed.data.other_value,
          parsed.data.other_reason,
        ],
      );
    }

    const result =
      await client.query<EventRecord>(
        `
          ${eventSelect}
          WHERE e.id = $1
        `,
        [eventId],
      );

    await client.query("COMMIT");

    res.status(201).json({
      event: result.rows[0],
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    if (error?.code === "23514") {
      res.status(409).json({
        error:
          "Event end must be after event start",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not create event",
    });
  } finally {
    client.release();
  }
});

eventsRouter.post("/:id/clone", async (req, res) => {
  const params =
    eventIdParamsSchema.safeParse(req.params);

  const body =
    cloneEventSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid event clone",
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

    const sourceResult = await client.query<{
      id: string;
      event_type_id: string;
      starts_at: string;
      ends_at: string;
      meal_menu_id: string | null;
      other_value: string | null;
      other_reason: string | null;
    }>(
      `
        SELECT
          e.id,
          e.event_type_id,
          e.starts_at,
          e.ends_at,
          e.meal_menu_id,
          eto.value AS other_value,
          eto.reason AS other_reason
        FROM events e
        LEFT JOIN event_type_others eto
          ON eto.event_id = e.id
        WHERE e.id = $1
        FOR SHARE OF e
      `,
      [params.data.id],
    );

    const source = sourceResult.rows[0];

    if (!source) {
      await client.query("ROLLBACK");
      res.status(404).json({
        error: "Event does not exist",
      });
      return;
    }

    const sourceStart = new Date(source.starts_at);
    const sourceEnd = new Date(source.ends_at);
    const targetStart = new Date(body.data.starts_at);
    const durationMs =
      sourceEnd.getTime() - sourceStart.getTime();

    const shiftTime = (value: string) =>
      new Date(
        targetStart.getTime() +
          (new Date(value).getTime() - sourceStart.getTime()),
      ).toISOString();

    const targetEnd = new Date(
      targetStart.getTime() + durationMs,
    ).toISOString();

    const duplicateResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM events
        WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
          AND starts_at = $2
          AND ends_at = $3
        LIMIT 1
      `,
      [
        body.data.name,
        body.data.starts_at,
        targetEnd,
      ],
    );

    if (duplicateResult.rows[0]) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "An event with this name and timing already exists",
      });
      return;
    }

    const insertedEvent = await client.query<{ id: string }>(
      `
        INSERT INTO events (
          name,
          event_type_id,
          starts_at,
          ends_at,
          meal_menu_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        body.data.name,
        source.event_type_id,
        body.data.starts_at,
        targetEnd,
        source.meal_menu_id,
      ],
    );

    const clonedEventId = insertedEvent.rows[0].id;

    if (source.other_value && source.other_reason) {
      await client.query(
        `
          INSERT INTO event_type_others (
            event_id,
            value,
            reason
          )
          VALUES ($1, $2, $3)
        `,
        [
          clonedEventId,
          source.other_value,
          source.other_reason,
        ],
      );
    }

    const sourceActivities = await client.query<{
      activity_id: string;
      starts_at: string;
      ends_at: string;
      capacity: number | null;
    }>(
      `
        SELECT
          activity_id,
          starts_at,
          ends_at,
          capacity
        FROM event_activities
        WHERE event_id = $1
        ORDER BY starts_at, id
      `,
      [source.id],
    );

    for (const activity of sourceActivities.rows) {
      await client.query(
        `
          INSERT INTO event_activities (
            event_id,
            activity_id,
            starts_at,
            ends_at,
            capacity
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          clonedEventId,
          activity.activity_id,
          shiftTime(activity.starts_at),
          shiftTime(activity.ends_at),
          activity.capacity,
        ],
      );
    }

    const sourceMeals = await client.query<{
      id: string;
      meal_type_id: string;
      title: string | null;
      notes: string | null;
      starts_at: string;
      ends_at: string;
      composition_mode: "DEFAULT_MENU" | "CUSTOM";
    }>(
      `
        SELECT
          id,
          meal_type_id,
          title,
          notes,
          starts_at,
          ends_at,
          composition_mode
        FROM event_meals
        WHERE event_id = $1
        ORDER BY starts_at, id
      `,
      [source.id],
    );

    for (const meal of sourceMeals.rows) {
      const insertedMeal = await client.query<{ id: string }>(
        `
          INSERT INTO event_meals (
            event_id,
            meal_type_id,
            title,
            notes,
            starts_at,
            ends_at,
            composition_mode
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [
          clonedEventId,
          meal.meal_type_id,
          meal.title,
          meal.notes,
          shiftTime(meal.starts_at),
          shiftTime(meal.ends_at),
          meal.composition_mode,
        ],
      );

      await client.query(
        `
          INSERT INTO event_meal_items (
            event_meal_id,
            item_id,
            sort_order
          )
          SELECT
            $1,
            item_id,
            sort_order
          FROM event_meal_items
          WHERE event_meal_id = $2
          ORDER BY sort_order, id
        `,
        [insertedMeal.rows[0].id, meal.id],
      );
    }

    const offeringsResult = await client.query(
      `
        INSERT INTO event_food_offerings (
          event_id,
          item_id,
          offering_type,
          sort_order,
          available
        )
        SELECT
          $1,
          item_id,
          offering_type,
          sort_order,
          available
        FROM event_food_offerings
        WHERE event_id = $2
        ORDER BY offering_type, sort_order, id
      `,
      [clonedEventId, source.id],
    );

    const result = await client.query<EventRecord>(
      `
        ${eventSelect}
        WHERE e.id = $1
      `,
      [clonedEventId],
    );

    await client.query("COMMIT");

    res.status(201).json({
      event: result.rows[0],
      copied: {
        activities: sourceActivities.rows.length,
        food_services: sourceMeals.rows.length,
        food_offerings: offeringsResult.rowCount ?? 0,
      },
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    if (error?.code === "23514") {
      res.status(409).json({
        error: "Cloned event schedule is invalid",
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: "Could not clone event",
    });
  } finally {
    client.release();
  }
});

eventsRouter.patch("/:id", async (req, res) => {
  const params =
    eventIdParamsSchema.safeParse(req.params);

  const body =
    updateEventSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({
      error: "Invalid event update",
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

    const currentResult =
      await client.query<{
        id: string;
        name: string;
        event_type_id: string;
        starts_at: string;
        ends_at: string;
        other_value: string | null;
        other_reason: string | null;
      }>(
        `
          SELECT
            e.id,
            e.name,
            e.event_type_id,
            e.starts_at,
            e.ends_at,
            eto.value AS other_value,
            eto.reason AS other_reason
          FROM events e
          LEFT JOIN event_type_others eto
            ON eto.event_id = e.id
          WHERE e.id = $1
          FOR UPDATE OF e
        `,
        [params.data.id],
      );

    const current =
      currentResult.rows[0];

    if (!current) {
      await client.query("ROLLBACK");

      res.status(404).json({
        error: "Event does not exist",
      });
      return;
    }

    const eventTypeId =
      body.data.event_type_id ??
      Number(current.event_type_id);

    const typeResult = await client.query<{
      name: string;
    }>(
      `
        SELECT name
        FROM event_types
        WHERE id = $1
        LIMIT 1
      `,
      [eventTypeId],
    );

    const eventType =
      typeResult.rows[0];

    if (!eventType) {
      await client.query("ROLLBACK");

      res.status(400).json({
        error: "Event type does not exist",
      });
      return;
    }

    const nextOtherValue =
      body.data.other_value ??
      current.other_value;

    const nextOtherReason =
      body.data.other_reason ??
      current.other_reason;

    if (
      eventType.name === "Other" &&
      (!nextOtherValue || !nextOtherReason)
    ) {
      await client.query("ROLLBACK");

      res.status(400).json({
        error:
          "Other event type requires a name and reason",
      });
      return;
    }

    await client.query(
      `
        UPDATE events
        SET
          name = COALESCE($2, name),
          event_type_id = $3,
          starts_at = COALESCE($4, starts_at),
          ends_at = COALESCE($5, ends_at)
        WHERE id = $1
      `,
      [
        params.data.id,
        body.data.name ?? null,
        eventTypeId,
        body.data.starts_at ?? null,
        body.data.ends_at ?? null,
      ],
    );

    await client.query(
      `
        DELETE FROM event_type_others
        WHERE event_id = $1
      `,
      [params.data.id],
    );

    if (eventType.name === "Other") {
      await client.query(
        `
          INSERT INTO event_type_others (
            event_id,
            value,
            reason
          )
          VALUES ($1, $2, $3)
        `,
        [
          params.data.id,
          nextOtherValue,
          nextOtherReason,
        ],
      );
    }

    const result =
      await client.query<EventRecord>(
        `
          ${eventSelect}
          WHERE e.id = $1
        `,
        [params.data.id],
      );

    await client.query("COMMIT");

    res.json({
      event: result.rows[0],
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    if (error?.code === "23514") {
      res.status(409).json({
        error:
          "Event end must be after event start",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not update event",
    });
  } finally {
    client.release();
  }
});

eventsRouter.delete("/:id", async (req, res) => {
  const parsed =
    eventIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid event id",
    });
    return;
  }

  try {
    const result = await query<{ id: string }>(
      `
        DELETE FROM events
        WHERE id = $1
        RETURNING id
      `,
      [parsed.data.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({
        error: "Event does not exist",
      });
      return;
    }

    res.json({
      ok: true,
      deleted_event_id:
        result.rows[0].id,
    });
  } catch (error: any) {
    if (error?.code === "23503") {
      res.status(409).json({
        error:
          "Cannot delete this event while registrations, activities, meals, or other records still belong to it",
      });
      return;
    }

    console.error(error);

    res.status(500).json({
      error: "Could not delete event",
    });
  }
});
