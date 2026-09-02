import { Router } from "express";

import {
  createActivityQualificationSchema,
  createEventActivitySchema,
  createEventActivityStaffSchema,
  createStaffAreaSchema,
  createStaffQualificationSchema,
  relationshipIdParamsSchema,
  type ActivityQualification,
  type EventActivity,
  type EventActivityStaff,
  type StaffArea,
  type StaffQualification,
} from "@appoponi/shared/schemas/scheduling";

import { query } from "../db/db.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const schedulingRouter = Router();

schedulingRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

schedulingRouter.get("/staff-areas", async (_req, res) => {
  const result = await query<StaffArea>(`
    SELECT
      sma.id,
      sma.staff_member_id,
      sm.full_name AS staff_name,
      sma.area_id,
      a.name AS area_name
    FROM staff_member_areas sma
    JOIN staff_members sm
      ON sm.id = sma.staff_member_id
    JOIN areas a
      ON a.id = sma.area_id
    ORDER BY sm.full_name, a.name
  `);

  res.json({ staff_areas: result.rows });
});

schedulingRouter.post("/staff-areas", async (req, res) => {
  const parsed =
    createStaffAreaSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid staff area assignment",
    });
    return;
  }

  try {
    const result = await query<StaffArea>(
      `
        WITH inserted AS (
          INSERT INTO staff_member_areas (
            staff_member_id,
            area_id
          )
          VALUES ($1, $2)
          RETURNING *
        )
        SELECT
          i.id,
          i.staff_member_id,
          sm.full_name AS staff_name,
          i.area_id,
          a.name AS area_name
        FROM inserted i
        JOIN staff_members sm
          ON sm.id = i.staff_member_id
        JOIN areas a
          ON a.id = i.area_id
      `,
      [
        parsed.data.staff_member_id,
        parsed.data.area_id,
      ],
    );

    res.status(201).json({
      staff_area: result.rows[0],
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({
        error: "Staff member already has that area",
      });
      return;
    }

    throw error;
  }
});

schedulingRouter.delete("/staff-areas/:id", async (req, res) => {
  const parsed =
    relationshipIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await query(
    `DELETE FROM staff_member_areas WHERE id = $1`,
    [parsed.data.id],
  );

  res.json({ ok: true });
});

schedulingRouter.get(
  "/staff-qualifications",
  async (_req, res) => {
    const result = await query<StaffQualification>(`
      SELECT
        sq.id,
        sq.staff_member_id,
        sm.full_name AS staff_name,
        sq.qualification_id,
        q.name AS qualification_name
      FROM staff_qualifications sq
      JOIN staff_members sm
        ON sm.id = sq.staff_member_id
      JOIN qualifications q
        ON q.id = sq.qualification_id
      ORDER BY sm.full_name, q.name
    `);

    res.json({
      staff_qualifications: result.rows,
    });
  },
);

schedulingRouter.post(
  "/staff-qualifications",
  async (req, res) => {
    const parsed =
      createStaffQualificationSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid staff qualification",
      });
      return;
    }

    try {
      const result =
        await query<StaffQualification>(
          `
            WITH inserted AS (
              INSERT INTO staff_qualifications (
                staff_member_id,
                qualification_id
              )
              VALUES ($1, $2)
              RETURNING *
            )
            SELECT
              i.id,
              i.staff_member_id,
              sm.full_name AS staff_name,
              i.qualification_id,
              q.name AS qualification_name
            FROM inserted i
            JOIN staff_members sm
              ON sm.id = i.staff_member_id
            JOIN qualifications q
              ON q.id = i.qualification_id
          `,
          [
            parsed.data.staff_member_id,
            parsed.data.qualification_id,
          ],
        );

      res.status(201).json({
        staff_qualification: result.rows[0],
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error:
            "Staff member already has that qualification",
        });
        return;
      }

      throw error;
    }
  },
);

schedulingRouter.delete(
  "/staff-qualifications/:id",
  async (req, res) => {
    const parsed =
      relationshipIdParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await query(
      `DELETE FROM staff_qualifications WHERE id = $1`,
      [parsed.data.id],
    );

    res.json({ ok: true });
  },
);

schedulingRouter.get(
  "/activity-qualifications",
  async (_req, res) => {
    const result = await query<ActivityQualification>(`
      SELECT
        aq.id,
        aq.activity_id,
        a.name AS activity_name,
        aq.qualification_id,
        q.name AS qualification_name,
        aq.required_staff_count
      FROM activity_qualifications aq
      JOIN activities a
        ON a.id = aq.activity_id
      JOIN qualifications q
        ON q.id = aq.qualification_id
      ORDER BY a.name, q.name
    `);

    res.json({
      activity_qualifications: result.rows,
    });
  },
);

schedulingRouter.post(
  "/activity-qualifications",
  async (req, res) => {
    const parsed =
      createActivityQualificationSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid activity requirement",
      });
      return;
    }

    try {
      const result =
        await query<ActivityQualification>(
          `
            WITH inserted AS (
              INSERT INTO activity_qualifications (
                activity_id,
                qualification_id,
                required_staff_count
              )
              VALUES ($1, $2, $3)
              RETURNING *
            )
            SELECT
              i.id,
              i.activity_id,
              a.name AS activity_name,
              i.qualification_id,
              q.name AS qualification_name,
              i.required_staff_count
            FROM inserted i
            JOIN activities a
              ON a.id = i.activity_id
            JOIN qualifications q
              ON q.id = i.qualification_id
          `,
          [
            parsed.data.activity_id,
            parsed.data.qualification_id,
            parsed.data.required_staff_count,
          ],
        );

      res.status(201).json({
        activity_qualification:
          result.rows[0],
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error:
            "Activity already has that qualification requirement",
        });
        return;
      }

      throw error;
    }
  },
);

schedulingRouter.delete(
  "/activity-qualifications/:id",
  async (req, res) => {
    const parsed =
      relationshipIdParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await query(
      `DELETE FROM activity_qualifications WHERE id = $1`,
      [parsed.data.id],
    );

    res.json({ ok: true });
  },
);

schedulingRouter.get(
  "/event-activities",
  async (_req, res) => {
    const result = await query<EventActivity>(`
      SELECT
        ea.id,
        ea.event_id,
        e.name AS event_name,
        ea.activity_id,
        a.name AS activity_name,
        ar.name AS area_name,
        ea.starts_at,
        ea.ends_at,
        ea.capacity
      FROM event_activities ea
      JOIN events e
        ON e.id = ea.event_id
      JOIN activities a
        ON a.id = ea.activity_id
      JOIN areas ar
        ON ar.id = a.area_id
      ORDER BY ea.starts_at, a.name
    `);

    res.json({
      event_activities: result.rows,
    });
  },
);

schedulingRouter.post(
  "/event-activities",
  async (req, res) => {
    const parsed =
      createEventActivitySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid scheduled activity",
      });
      return;
    }

    try {
      const result = await query<EventActivity>(
        `
          WITH inserted AS (
            INSERT INTO event_activities (
              event_id,
              activity_id,
              starts_at,
              ends_at,
              capacity
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          )
          SELECT
            i.id,
            i.event_id,
            e.name AS event_name,
            i.activity_id,
            a.name AS activity_name,
            ar.name AS area_name,
            i.starts_at,
            i.ends_at,
            i.capacity
          FROM inserted i
          JOIN events e
            ON e.id = i.event_id
          JOIN activities a
            ON a.id = i.activity_id
          JOIN areas ar
            ON ar.id = a.area_id
        `,
        [
          parsed.data.event_id,
          parsed.data.activity_id,
          parsed.data.starts_at,
          parsed.data.ends_at,
          parsed.data.capacity ?? null,
        ],
      );

      res.status(201).json({
        event_activity: result.rows[0],
      });
    } catch (error: any) {
      if (
        String(error?.message ?? "").includes(
          "EVENT_TIME_OUTSIDE_EVENT",
        )
      ) {
        res.status(409).json({
          error:
            "Scheduled activity must occur inside the event dates",
        });
        return;
      }

      throw error;
    }
  },
);

schedulingRouter.delete(
  "/event-activities/:id",
  async (req, res) => {
    const parsed =
      relationshipIdParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    try {
      await query(
        `DELETE FROM event_activities WHERE id = $1`,
        [parsed.data.id],
      );

      res.json({ ok: true });
    } catch (error: any) {
      if (error?.code === "23503") {
        res.status(409).json({
          error:
            "Remove staff assignments and participant signups first",
        });
        return;
      }

      throw error;
    }
  },
);

schedulingRouter.get(
  "/event-activity-staff",
  async (_req, res) => {
    const result =
      await query<EventActivityStaff>(`
        SELECT
          eas.id,
          eas.event_activity_id,
          eas.staff_member_id,
          sm.full_name AS staff_name
        FROM event_activity_staff eas
        JOIN staff_members sm
          ON sm.id = eas.staff_member_id
        ORDER BY eas.event_activity_id, sm.full_name
      `);

    res.json({
      event_activity_staff: result.rows,
    });
  },
);

schedulingRouter.post(
  "/event-activity-staff",
  async (req, res) => {
    const parsed =
      createEventActivityStaffSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid staff assignment",
      });
      return;
    }

    try {
      const result =
        await query<EventActivityStaff>(
          `
            WITH inserted AS (
              INSERT INTO event_activity_staff (
                event_activity_id,
                staff_member_id
              )
              VALUES ($1, $2)
              RETURNING *
            )
            SELECT
              i.id,
              i.event_activity_id,
              i.staff_member_id,
              sm.full_name AS staff_name
            FROM inserted i
            JOIN staff_members sm
              ON sm.id = i.staff_member_id
          `,
          [
            parsed.data.event_activity_id,
            parsed.data.staff_member_id,
          ],
        );

      res.status(201).json({
        event_activity_staff:
          result.rows[0],
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({
          error:
            "Staff member is already assigned to this activity",
        });
        return;
      }

      if (
        String(error?.message ?? "").includes(
          "STAFF_ACTIVITY_TIME_CONFLICT",
        )
      ) {
        res.status(409).json({
          error:
            "Staff member is already working another activity or babysitting at that time",
        });
        return;
      }

      throw error;
    }
  },
);

schedulingRouter.delete(
  "/event-activity-staff/:id",
  async (req, res) => {
    const parsed =
      relationshipIdParamsSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await query(
      `DELETE FROM event_activity_staff WHERE id = $1`,
      [parsed.data.id],
    );

    res.json({ ok: true });
  },
);
