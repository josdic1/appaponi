import { Router } from "express";

import {
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

export const notificationsRouter =
  Router();

notificationsRouter.use(
  requireAuth,
  requirePasswordChanged,
);

notificationsRouter.get(
  "/preferences",
  async (req, res) => {
    await query(
      `
        INSERT INTO notification_preferences (
          account_id
        )
        VALUES ($1)
        ON CONFLICT (account_id)
        DO NOTHING
      `,
      [req.auth!.sub],
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
        [req.auth!.sub],
      );

    res.json({
      preferences: result.rows[0],
    });
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

    await query(
      `
        INSERT INTO notification_preferences (
          account_id
        )
        VALUES ($1)
        ON CONFLICT (account_id)
        DO NOTHING
      `,
      [req.auth!.sub],
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
              COALESCE($5, general_notifications)
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

    res.json({
      preferences: result.rows[0],
    });
  },
);

notificationsRouter.get(
  "/",
  async (req, res) => {
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
            created_at
          FROM notifications
          WHERE account_id = $1
          ORDER BY created_at DESC
        `,
        [req.auth!.sub],
      );

    res.json({
      notifications: result.rows,
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
            created_at
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
          RETURNING
            id,
            account_id,
            event_id,
            kind,
            title,
            body,
            scheduled_for,
            read_at,
            created_at
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
