import { Router } from "express";

import type {
  EventType,
} from "@appoponi/shared/schemas/events";

import { query } from "../db/db.js";

import {
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const eventTypesRouter = Router();

eventTypesRouter.get(
  "/",
  requireAuth,
  requirePasswordChanged,
  async (_req, res) => {
    try {
      const result = await query<EventType>(`
        SELECT
          id,
          name,
          created_at,
          updated_at
        FROM event_types
        ORDER BY id
      `);

      res.json({
        event_types: result.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load event types",
      });
    }
  },
);
