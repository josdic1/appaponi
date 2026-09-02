import { Router } from "express";

import {
  createEventSchema,
  eventIdParamsSchema,
  updateEventSchema,
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
    e.created_at,
    e.updated_at
  FROM events e
  JOIN event_types et
    ON et.id = e.event_type_id
  LEFT JOIN event_type_others eto
    ON eto.event_id = e.id
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
