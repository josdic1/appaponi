import { Router } from "express";

import {
  createEventNotificationBroadcastSchema,
  createNotificationSchema,
  notificationIdParamsSchema,
  updateNotificationPreferencesSchema,
  type NotificationPreferences,
  type NotificationRecord,
} from "@appoponi/shared/schemas/notifications";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.use(
  requireAuth,
  requirePasswordChanged,
);

async function ensurePreferences(
  accountId: string,
) {
  await query(
    `
      INSERT INTO notification_preferences (
        account_id
      )
      VALUES ($1)
      ON CONFLICT (account_id)
      DO NOTHING
    `,
    [accountId],
  );

  const result =
    await query<NotificationPreferences>(
      `
        SELECT
          account_id,
          activity_reminders,
          meal_reminders,
          special_notifications,
          general_notifications
        FROM notification_preferences
        WHERE account_id = $1
      `,
      [accountId],
    );

  return result.rows[0];
}

async function syncActivityReminders(
  accountId: string,
  accountType: "member" | "staff" | "admin",
  enabled: boolean,
) {
  if (!enabled || accountType === "admin") {
    await query(
      `
        DELETE FROM notifications
        WHERE account_id = $1
          AND source_type = 'event_activity'
          AND read_at IS NULL
      `,
      [accountId],
    );
    return;
  }

  if (accountType === "member") {
    await query(
      `
        INSERT INTO notifications (
          account_id,
          event_id,
          kind,
          title,
          body,
          scheduled_for,
          source_type,
          source_id
        )
        SELECT DISTINCT
          hm.account_id,
          ea.event_id,
          'activity',
          'Activity reminder · ' || a.name,
          a.name || ' starts in 30 minutes' ||
            CASE
              WHEN ar.name IS NULL THEN '.'
              ELSE ' at ' || ar.name || '.'
            END,
          ea.starts_at - INTERVAL '30 minutes',
          'event_activity',
          ea.id
        FROM household_members hm
        JOIN member_attendees ma
          ON ma.member_id = hm.id
        JOIN event_activity_signups eas
          ON eas.member_attendee_id = ma.id
        JOIN event_activities ea
          ON ea.id = eas.event_activity_id
        JOIN activities a
          ON a.id = ea.activity_id
        LEFT JOIN areas ar
          ON ar.id = a.area_id
        WHERE hm.account_id = $1
          AND ea.ends_at > NOW()
        ON CONFLICT (
          account_id,
          source_type,
          source_id
        )
        WHERE source_type IS NOT NULL
        DO UPDATE SET
          event_id = EXCLUDED.event_id,
          kind = EXCLUDED.kind,
          title = EXCLUDED.title,
          body = EXCLUDED.body,
          scheduled_for = EXCLUDED.scheduled_for
      `,
      [accountId],
    );

    await query(
      `
        DELETE FROM notifications n
        WHERE n.account_id = $1
          AND n.source_type = 'event_activity'
          AND n.read_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM household_members hm
            JOIN member_attendees ma
              ON ma.member_id = hm.id
            JOIN event_activity_signups eas
              ON eas.member_attendee_id = ma.id
            JOIN event_activities ea
              ON ea.id = eas.event_activity_id
            WHERE hm.account_id = $1
              AND ea.id = n.source_id
              AND ea.ends_at > NOW()
          )
      `,
      [accountId],
    );
    return;
  }

  await query(
    `
      INSERT INTO notifications (
        account_id,
        event_id,
        kind,
        title,
        body,
        scheduled_for,
        source_type,
        source_id
      )
      SELECT DISTINCT
        sm.account_id,
        ea.event_id,
        'activity',
        'Activity reminder · ' || a.name,
        a.name || ' starts in 30 minutes' ||
          CASE
            WHEN ar.name IS NULL THEN '.'
            ELSE ' at ' || ar.name || '.'
          END,
        ea.starts_at - INTERVAL '30 minutes',
        'event_activity',
        ea.id
      FROM staff_members sm
      JOIN event_activity_staff eas
        ON eas.staff_member_id = sm.id
      JOIN event_activities ea
        ON ea.id = eas.event_activity_id
      JOIN activities a
        ON a.id = ea.activity_id
      LEFT JOIN areas ar
        ON ar.id = a.area_id
      WHERE sm.account_id = $1
        AND ea.ends_at > NOW()
      ON CONFLICT (
        account_id,
        source_type,
        source_id
      )
      WHERE source_type IS NOT NULL
      DO UPDATE SET
        event_id = EXCLUDED.event_id,
        kind = EXCLUDED.kind,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        scheduled_for = EXCLUDED.scheduled_for
    `,
    [accountId],
  );

  await query(
    `
      DELETE FROM notifications n
      WHERE n.account_id = $1
        AND n.source_type = 'event_activity'
        AND n.read_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM staff_members sm
          JOIN event_activity_staff eas
            ON eas.staff_member_id = sm.id
          JOIN event_activities ea
            ON ea.id = eas.event_activity_id
          WHERE sm.account_id = $1
            AND ea.id = n.source_id
            AND ea.ends_at > NOW()
        )
    `,
    [accountId],
  );
}

async function syncMealReminders(
  accountId: string,
  accountType: "member" | "staff" | "admin",
  enabled: boolean,
) {
  if (!enabled || accountType !== "member") {
    await query(
      `
        DELETE FROM notifications
        WHERE account_id = $1
          AND source_type = 'event_meal'
          AND read_at IS NULL
      `,
      [accountId],
    );
    return;
  }

  await query(
    `
      INSERT INTO notifications (
        account_id,
        event_id,
        kind,
        title,
        body,
        scheduled_for,
        source_type,
        source_id
      )
      SELECT
        er.account_id,
        em.event_id,
        'meal',
        'Meal reminder · ' ||
          COALESCE(
            NULLIF(em.title, ''),
            mt.name
          ),
        COALESCE(
          NULLIF(em.title, ''),
          mt.name
        ) || ' starts in 30 minutes.',
        em.starts_at - INTERVAL '30 minutes',
        'event_meal',
        em.id
      FROM event_registrations er
      JOIN event_meals em
        ON em.event_id = er.event_id
      JOIN meal_types mt
        ON mt.id = em.meal_type_id
      WHERE er.account_id = $1
        AND em.ends_at > NOW()
      ON CONFLICT (
        account_id,
        source_type,
        source_id
      )
      WHERE source_type IS NOT NULL
      DO UPDATE SET
        event_id = EXCLUDED.event_id,
        kind = EXCLUDED.kind,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        scheduled_for = EXCLUDED.scheduled_for
    `,
    [accountId],
  );

  await query(
    `
      DELETE FROM notifications n
      WHERE n.account_id = $1
        AND n.source_type = 'event_meal'
        AND n.read_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM event_registrations er
          JOIN event_meals em
            ON em.event_id = er.event_id
          WHERE er.account_id = $1
            AND em.id = n.source_id
            AND em.ends_at > NOW()
        )
    `,
    [accountId],
  );
}

async function syncAutomaticReminders(
  accountId: string,
  accountType: "member" | "staff" | "admin",
) {
  const preferences =
    await ensurePreferences(accountId);

  await syncActivityReminders(
    accountId,
    accountType,
    preferences.activity_reminders,
  );

  await syncMealReminders(
    accountId,
    accountType,
    preferences.meal_reminders,
  );

  return preferences;
}

notificationsRouter.get(
  "/preferences",
  async (req, res) => {
    const preferences =
      await ensurePreferences(
        req.auth!.sub,
      );

    res.json({ preferences });
  },
);

notificationsRouter.patch(
  "/preferences",
  async (req, res) => {
    const parsed =
      updateNotificationPreferencesSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid notification preferences",
      });
      return;
    }

    await ensurePreferences(
      req.auth!.sub,
    );

    const result =
      await query<NotificationPreferences>(
        `
          UPDATE notification_preferences
          SET
            activity_reminders =
              COALESCE($2, activity_reminders),
            meal_reminders =
              COALESCE($3, meal_reminders),
            special_notifications =
              COALESCE($4, special_notifications),
            general_notifications =
              COALESCE($5, general_notifications),
            updated_at = NOW()
          WHERE account_id = $1
          RETURNING
            account_id,
            activity_reminders,
            meal_reminders,
            special_notifications,
            general_notifications
        `,
        [
          req.auth!.sub,
          parsed.data.activity_reminders ?? null,
          parsed.data.meal_reminders ?? null,
          parsed.data.special_notifications ?? null,
          parsed.data.general_notifications ?? null,
        ],
      );

    await syncAutomaticReminders(
      req.auth!.sub,
      req.auth!.account_type,
    );

    res.json({
      preferences: result.rows[0],
    });
  },
);

notificationsRouter.get(
  "/",
  async (req, res) => {
    const preferences =
      await syncAutomaticReminders(
        req.auth!.sub,
        req.auth!.account_type,
      );

    const result =
      await query<NotificationRecord>(
        `
          SELECT
            id,
            account_id,
            event_id,
            kind,
            title,
            body,
            scheduled_for,
            read_at,
            created_at,
            source_type,
            source_id
          FROM notifications
          WHERE account_id = $1
            AND (
              scheduled_for IS NULL
              OR scheduled_for <= NOW()
            )
            AND (
              (kind = 'activity' AND $2)
              OR (kind = 'meal' AND $3)
              OR (kind = 'special' AND $4)
              OR (kind = 'general' AND $5)
            )
          ORDER BY
            COALESCE(
              scheduled_for,
              created_at
            ) DESC,
            created_at DESC
        `,
        [
          req.auth!.sub,
          preferences.activity_reminders,
          preferences.meal_reminders,
          preferences.special_notifications,
          preferences.general_notifications,
        ],
      );

    res.json({
      notifications: result.rows,
    });
  },
);

notificationsRouter.post(
  "/broadcast",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createEventNotificationBroadcastSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error:
          "Invalid event notification",
      });
      return;
    }

    const eventResult =
      await query<{ id: string }>(
        `
          SELECT id
          FROM events
          WHERE id = $1
          LIMIT 1
        `,
        [parsed.data.event_id],
      );

    if (!eventResult.rows[0]) {
      res.status(404).json({
        error: "Event does not exist",
      });
      return;
    }

    const result = await query<{ id: string }>(
      `
        INSERT INTO notifications (
          account_id,
          event_id,
          kind,
          title,
          body,
          scheduled_for
        )
        SELECT
          er.account_id,
          er.event_id,
          $2,
          $3,
          $4,
          $5
        FROM event_registrations er
        WHERE er.event_id = $1
        RETURNING id
      `,
      [
        parsed.data.event_id,
        parsed.data.kind,
        parsed.data.title,
        parsed.data.body,
        parsed.data.scheduled_for ?? null,
      ],
    );

    res.status(201).json({
      recipient_count:
        result.rowCount ?? 0,
    });
  },
);

notificationsRouter.post(
  "/",
  requireAccountType("admin"),
  async (req, res) => {
    const parsed =
      createNotificationSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid notification",
      });
      return;
    }

    const accountResult =
      await query<{ id: string }>(
        `
          SELECT id
          FROM accounts
          WHERE id = $1
          LIMIT 1
        `,
        [parsed.data.account_id],
      );

    if (!accountResult.rows[0]) {
      res.status(404).json({
        error: "Account does not exist",
      });
      return;
    }

    const result =
      await query<NotificationRecord>(
        `
          INSERT INTO notifications (
            account_id,
            event_id,
            kind,
            title,
            body,
            scheduled_for
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING
            id,
            account_id,
            event_id,
            kind,
            title,
            body,
            scheduled_for,
            read_at,
            created_at,
            source_type,
            source_id
        `,
        [
          parsed.data.account_id,
          parsed.data.event_id ?? null,
          parsed.data.kind,
          parsed.data.title,
          parsed.data.body,
          parsed.data.scheduled_for ?? null,
        ],
      );

    res.status(201).json({
      notification: result.rows[0],
    });
  },
);

notificationsRouter.patch(
  "/:id/read",
  async (req, res) => {
    const params =
      notificationIdParamsSchema.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error:
          "Invalid notification id",
      });
      return;
    }

    const result =
      await query<NotificationRecord>(
        `
          UPDATE notifications
          SET
            read_at =
              COALESCE(
                read_at,
                NOW()
              )
          WHERE id = $1
            AND account_id = $2
            AND (
              scheduled_for IS NULL
              OR scheduled_for <= NOW()
            )
          RETURNING
            id,
            account_id,
            event_id,
            kind,
            title,
            body,
            scheduled_for,
            read_at,
            created_at,
            source_type,
            source_id
        `,
        [
          params.data.id,
          req.auth!.sub,
        ],
      );

    const notification =
      result.rows[0];

    if (!notification) {
      res.status(404).json({
        error:
          "Notification does not exist",
      });
      return;
    }

    res.json({ notification });
  },
);
