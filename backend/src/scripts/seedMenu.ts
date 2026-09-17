import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { familyCampMenuSeed } from "../demo/familyCampMenu.js";
import { pool } from "../db/pool.js";
import {
  seedMenu,
  type MenuSeed,
} from "../services/menuSeeds.js";

async function loadSeed(input: string | undefined): Promise<MenuSeed> {
  if (!input || input === "family-camp") {
    return familyCampMenuSeed;
  }

  const filename = path.resolve(input);
  const raw = await fs.readFile(filename, "utf8");
  return JSON.parse(raw) as MenuSeed;
}

async function main() {
  const seed = await loadSeed(process.argv[2]);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const menuId = await seedMenu(client, seed);
    await client.query("COMMIT");

    console.log(`MENU SEEDED: ${seed.name} (#${menuId})`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
