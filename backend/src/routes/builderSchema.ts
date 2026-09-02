import { Router } from "express";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const builderSchemaRouter = Router();

builderSchemaRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

builderSchemaRouter.get("/", async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    res.json({
      configured: false,
      tables: [],
    });
    return;
  }

  try {
    const { pool } = await import("../db/pool.js");

    const tablesResult = await pool.query<{
      table_name: string;
    }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const columnsResult = await pool.query<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
      column_default: string | null;
      ordinal_position: number;
    }>(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const relationshipsResult = await pool.query<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    res.json({
      configured: true,
      tables: tablesResult.rows.map((table) => ({
        name: table.table_name,
        columns: columnsResult.rows.filter(
          (column) => column.table_name === table.table_name,
        ),
        relationships: relationshipsResult.rows.filter(
          (relationship) =>
            relationship.table_name === table.table_name,
        ),
      })),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      configured: true,
      error: "Could not inspect database schema",
    });
  }
});
