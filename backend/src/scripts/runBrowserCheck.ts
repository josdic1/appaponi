import "dotenv/config";

import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import argon2 from "argon2";
import pg from "pg";
import { chromium, type Browser, type Page } from "playwright-core";

const { Client } = pg;

const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const CHECK_DATABASE = "appoponi_browser_check";
const BACKEND_PORT = 3003;
const FRONTEND_PORT = 5178;
const ADMIN_USERNAME = "browser-check-admin";
const ADMIN_PASSWORD = "browser-check-password";
const MEMBER_USERNAME = "dicker";
const STAFF_USERNAME = "quinn";
const DEMO_PASSWORD = "demo";

const backendDir = process.cwd();
const repoRoot = resolve(backendDir, "..");
const frontendDir = resolve(repoRoot, "frontend");
const tsxBin = resolve(repoRoot, "node_modules", ".bin", "tsx");
const viteBin = resolve(repoRoot, "node_modules", ".bin", "vite");
const backendUrl = `http://127.0.0.1:${BACKEND_PORT}`;
const frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;

function databaseUrl(databaseName: string) {
  const url = new URL(sourceDatabaseUrl!);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

const checkDatabaseUrl = databaseUrl(CHECK_DATABASE);
const postgresDatabaseUrl = databaseUrl("postgres");

async function withPostgresClient<T>(work: (client: InstanceType<typeof Client>) => Promise<T>) {
  const client = new Client({ connectionString: postgresDatabaseUrl });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function terminateCheckConnections(client: InstanceType<typeof Client>) {
  await client.query(
    `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()
    `,
    [CHECK_DATABASE],
  );
}

async function resetCheckDatabase() {
  await withPostgresClient(async (client) => {
    await terminateCheckConnections(client);
    await client.query(`DROP DATABASE IF EXISTS "${CHECK_DATABASE}"`);
    await client.query(`CREATE DATABASE "${CHECK_DATABASE}"`);
  });
}

async function dropCheckDatabase() {
  await withPostgresClient(async (client) => {
    await terminateCheckConnections(client);
    await client.query(`DROP DATABASE IF EXISTS "${CHECK_DATABASE}"`);
  });
}

function command(executable: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; quiet?: boolean } = {}) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? backendDir,
      env: { ...process.env, ...options.env },
      stdio: options.quiet ? "ignore" : "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${executable} ${args.join(" ")} failed ${signal ? `with ${signal}` : `with exit code ${code}`}`));
    });
  });
}

async function createCheckAdmin() {
  const client = new Client({ connectionString: checkDatabaseUrl });
  await client.connect();
  try {
    const passwordHash = await argon2.hash(ADMIN_PASSWORD);
    await client.query(
      `
        INSERT INTO accounts (
          username,
          password_hash,
          account_type,
          must_change_password
        )
        VALUES ($1, $2, 'admin', FALSE)
      `,
      [ADMIN_USERNAME, passwordHash],
    );
  } finally {
    await client.end();
  }
}

async function waitForUrl(url: string, process: ChildProcess, label: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (process.exitCode !== null) {
      throw new Error(`${label} exited before becoming ready`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Still starting.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function ensurePortIsFree(url: string, label: string) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      throw new Error(`${label} is already running at ${url}. Stop it before running the browser check.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("already running")) throw error;
  }
}

class Session {
  private cookie = "";

  async request(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(`${backendUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${method} ${path} → ${response.status}${text ? `\n${text}` : ""}`);
    }

    return text ? JSON.parse(text) : null;
  }
}

async function seedDemo() {
  const session = new Session();
  await session.request("POST", "/api/auth/login", {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });
  await session.request("POST", "/api/dev/demo/seed-alumni-weekend");
}

function attachPageFailureChecks(page: Page, role: string) {
  const failures: string[] = [];

  page.on("pageerror", (error) => {
    failures.push(error.message);
  });

  return () => {
    if (failures.length) {
      throw new Error(`Browser errors in ${role}:\n${failures.join("\n")}`);
    }
  };
}

async function assertVisible(page: Page, selector: string, label: string) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout: 10_000 });
  console.log(`PASS  ${label}`);
}

async function assertHeading(page: Page, name: string, label: string) {
  await page.getByRole("heading", { name, exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  console.log(`PASS  ${label}`);
}

async function login(page: Page, username: string, password: string) {
  await page.goto(frontendUrl, { waitUntil: "domcontentloaded" });
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function clickSection(page: Page, railLabel: string, sectionLabel: string) {
  const rail = page.locator(`aside[aria-label="${railLabel}"]`);
  await rail.getByRole("button", { name: sectionLabel, exact: true }).click();
  await delay(150);
}

async function checkAdmin(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const assertNoPageErrors = attachPageFailureChecks(page, "admin");

  try {
    await login(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await assertVisible(page, 'aside[aria-label="Admin sections"]', "admin shell");
    await assertVisible(page, 'aside[aria-label="Admin navigation"]', "admin navigation rail");

    const adminNavigation =
      page.locator(
        'aside[aria-label="Admin navigation"]',
      );

    await adminNavigation
      .getByText(
        "Appoponi",
        { exact: true },
      )
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });

    await adminNavigation
      .getByText(
        `@${ADMIN_USERNAME}`,
        { exact: true },
      )
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });

    console.log(
      "PASS  admin rail brand + account",
    );

    await clickSection(page, "Admin sections", "Event HQ");
    await assertVisible(page, ".event-hq", "admin Event HQ");

    const checks: Array<[string, string]> = [
      ["Accounts", "Accounts & households"],
      ["Staff", "Staff"],
      ["Operations", "Events & libraries"],
      ["Scheduling", "Schedule"],
      ["Guests + cabins", "Guests + cabins"],
      ["Meal planning", "Meal planning"],
      ["Services", "Services"],
    ];

    for (const [section, heading] of checks) {
      await clickSection(page, "Admin sections", section);
      await assertHeading(page, heading, `admin ${section}`);
    }

    await clickSection(
      page,
      "Admin sections",
      "Guests + cabins",
    );

    const guestSections =
      page.locator(
        'aside[aria-label="Guests and cabins sections"]',
      );

    await guestSections
      .getByRole(
        "button",
        {
          name: "Cabins",
          exact: true,
        },
      )
      .click();

    await page
      .locator(
        '[data-testid="cabins-view"]',
      )
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });

    if (
      await page
        .locator(
          '[data-testid="registered-households-panel"]',
        )
        .isVisible()
    ) {
      throw new Error(
        "Registered households remained visible in Cabins view",
      );
    }

    console.log(
      "PASS  guests + cabins rail switches views",
    );

    await page
      .locator(
        '[data-cabin-slot-id="cabin-14"]',
      )
      .click();

    const cabinPanel =
      page.locator(
        '[data-testid="cabin-command-panel"]',
      );

    await cabinPanel.waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await cabinPanel
      .getByText(
        "Dicker Family",
        { exact: true },
      )
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });

    await cabinPanel
      .getByRole(
        "button",
        {
          name: "Send message",
          exact: true,
        },
      )
      .waitFor({
        state: "visible",
        timeout: 10_000,
      });

    console.log(
      "PASS  admin clickable cabin command panel",
    );

    assertNoPageErrors();
  } finally {
    await context.close();
  }
}

async function checkMember(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const assertNoPageErrors = attachPageFailureChecks(page, "member");

  try {
    await login(page, MEMBER_USERNAME, DEMO_PASSWORD);
    await assertVisible(page, 'aside[aria-label="Member sections"]', "member shell on phone size");
    await assertVisible(page, "#member-today", "member Today");

    const checks: Array<[string, string]> = [
      ["Itinerary", "#member-itinerary"],
      ["Stay + map", "#member-stay"],
      ["Food + services", "#member-services"],
      ["Directory", "#member-directory"],
      ["Household", "#member-household"],
    ];

    for (const [section, selector] of checks) {
      await clickSection(page, "Member sections", section);
      await assertVisible(page, selector, `member ${section}`);
    }

    await assertVisible(page, "#member-map", "member camp map");
    assertNoPageErrors();
  } finally {
    await context.close();
  }
}

async function checkStaff(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const assertNoPageErrors = attachPageFailureChecks(page, "staff");

  try {
    await login(page, STAFF_USERNAME, DEMO_PASSWORD);
    await assertVisible(page, 'aside[aria-label="Staff sections"]', "staff shell on phone size");
    await assertVisible(page, "#staff-today", "staff Today");
    await assertVisible(page, ".staff-today-grid", "staff Now / Next / Needs action");

    for (const section of ["Notices", "Schedule"]) {
      const rail = page.locator('aside[aria-label="Staff sections"]');
      const button = rail.getByRole("button", { name: new RegExp(`^${section}`) });
      await button.click();
      console.log(`PASS  staff ${section}`);
    }

    assertNoPageErrors();
  } finally {
    await context.close();
  }
}

async function main() {
  let backend: ChildProcess | null = null;
  let frontend: ChildProcess | null = null;
  let browser: Browser | null = null;

  console.log("APPOPONI BROWSER CHECK: preparing disposable database");

  await ensurePortIsFree(`${backendUrl}/api/health`, "Browser-check backend");
  await ensurePortIsFree(frontendUrl, "Browser-check frontend");

  try {
    await resetCheckDatabase();

    await command(tsxBin, ["src/scripts/migrate.ts"], {
      env: { DATABASE_URL: checkDatabaseUrl },
    });

    await createCheckAdmin();

    backend = spawn(tsxBin, ["src/server.ts"], {
      cwd: backendDir,
      env: {
        ...process.env,
        DATABASE_URL: checkDatabaseUrl,
        PORT: String(BACKEND_PORT),
        FRONTEND_URL: frontendUrl,
        NODE_ENV: "development",
      },
      stdio: "inherit",
    });

    await waitForUrl(`${backendUrl}/api/health`, backend, "browser-check backend");
    await seedDemo();

    frontend = spawn(viteBin, ["--host", "127.0.0.1", "--port", String(FRONTEND_PORT), "--strictPort"], {
      cwd: frontendDir,
      env: {
        ...process.env,
        VITE_API_URL: backendUrl,
      },
      stdio: "inherit",
    });

    await waitForUrl(frontendUrl, frontend, "browser-check frontend");

    browser = await chromium.launch({ headless: true, channel: "chrome" });

    await checkAdmin(browser);
    await checkMember(browser);
    await checkStaff(browser);

    console.log("");
    console.log("======================================");
    console.log("APPOPONI BROWSER CHECK: PASS");
    console.log("======================================");
  } finally {
    if (browser) await browser.close();

    if (frontend && frontend.exitCode === null) {
      frontend.kill("SIGTERM");
      await delay(150);
    }

    if (backend && backend.exitCode === null) {
      backend.kill("SIGTERM");
      await delay(150);
    }

    await dropCheckDatabase();
    console.log("APPOPONI BROWSER CHECK: disposable database removed");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
