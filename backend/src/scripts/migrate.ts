import "dotenv/config";

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { pool } from "../db/pool.js";

const migrationsDir = resolve(
  process.cwd(),
  "src/db/migrations",
);

await pool.query(`
  CREATE TABLE IF NOT EXISTS appoponi_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const files = (await readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const name of files) {
  const existing = await pool.query(
    `
      SELECT 1
      FROM appoponi_migrations
      WHERE name = $1
      LIMIT 1
    `,
    [name],
  );

  if (existing.rowCount) {
    console.log(`skip ${name}`);
    continue;
  }

  const sql = await readFile(
    resolve(migrationsDir, name),
    "utf8",
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);

    await client.query(
      `
        INSERT INTO appoponi_migrations (name)
        VALUES ($1)
      `,
      [name],
    );

    await client.query("COMMIT");
    console.log(`apply ${name}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
