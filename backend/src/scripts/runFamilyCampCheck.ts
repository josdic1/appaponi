import "dotenv/config";

import {
  spawn,
  type ChildProcess,
} from "node:child_process";

import {
  resolve,
} from "node:path";

import {
  setTimeout as delay,
} from "node:timers/promises";

import argon2 from "argon2";
import pg from "pg";

const { Client } = pg;

const sourceDatabaseUrl =
  process.env.DATABASE_URL;

if (!sourceDatabaseUrl) {
  throw new Error(
    "DATABASE_URL is required",
  );
}

const CHECK_DATABASE =
  "appoponi_check";

const CHECK_PORT = 3002;

const CHECK_ADMIN_USERNAME =
  "check-admin";

const CHECK_ADMIN_PASSWORD =
  "check-admin-password";

const backendDir = process.cwd();

const repoRoot = resolve(
  backendDir,
  "..",
);

const tsxBin = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  "tsx",
);

function databaseUrl(
  databaseName: string,
) {
  const url =
    new URL(sourceDatabaseUrl!);

  url.pathname =
    `/${databaseName}`;

  return url.toString();
}

const checkDatabaseUrl =
  databaseUrl(CHECK_DATABASE);

const postgresDatabaseUrl =
  databaseUrl("postgres");

function command(
  executable: string,
  args: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    quiet?: boolean;
  } = {},
) {
  return new Promise<void>(
    (resolvePromise, reject) => {
      const child = spawn(
        executable,
        args,
        {
          cwd: backendDir,
          env: {
            ...process.env,
            ...options.env,
          },
          stdio:
            options.quiet
              ? "ignore"
              : "inherit",
        },
      );

      child.once(
        "error",
        reject,
      );

      child.once(
        "exit",
        (code, signal) => {
          if (code === 0) {
            resolvePromise();
            return;
          }

          reject(
            new Error(
              `${executable} ${args.join(
                " ",
              )} failed ${
                signal
                  ? `with ${signal}`
                  : `with exit code ${code}`
              }`,
            ),
          );
        },
      );
    },
  );
}

async function withPostgresClient<T>(
  work: (
    client: InstanceType<
      typeof Client
    >,
  ) => Promise<T>,
) {
  const client = new Client({
    connectionString:
      postgresDatabaseUrl,
  });

  await client.connect();

  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function terminateCheckConnections(
  client: InstanceType<
    typeof Client
  >,
) {
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
  await withPostgresClient(
    async (client) => {
      await terminateCheckConnections(
        client,
      );

      await client.query(
        `DROP DATABASE IF EXISTS "${CHECK_DATABASE}"`,
      );

      await client.query(
        `CREATE DATABASE "${CHECK_DATABASE}"`,
      );
    },
  );
}

async function dropCheckDatabase() {
  await withPostgresClient(
    async (client) => {
      await terminateCheckConnections(
        client,
      );

      await client.query(
        `DROP DATABASE IF EXISTS "${CHECK_DATABASE}"`,
      );
    },
  );
}

async function createCheckAdmin() {
  const client = new Client({
    connectionString:
      checkDatabaseUrl,
  });

  await client.connect();

  try {
    const passwordHash =
      await argon2.hash(
        CHECK_ADMIN_PASSWORD,
      );

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
      [
        CHECK_ADMIN_USERNAME,
        passwordHash,
      ],
    );
  } finally {
    await client.end();
  }
}

async function waitForServer(
  server: ChildProcess,
) {
  const url =
    `http://localhost:${CHECK_PORT}/api/health`;

  for (
    let attempt = 0;
    attempt < 60;
    attempt += 1
  ) {
    if (
      server.exitCode !== null
    ) {
      throw new Error(
        "Check backend exited before becoming ready",
      );
    }

    try {
      const response =
        await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await delay(100);
  }

  throw new Error(
    "Timed out waiting for isolated check backend",
  );
}

async function ensurePortIsFree() {
  try {
    const response =
      await fetch(
        `http://localhost:${CHECK_PORT}/api/health`,
      );

    if (response.ok) {
      throw new Error(
        `Port ${CHECK_PORT} is already serving Appoponi. Stop that process before running the check.`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(
        `Port ${CHECK_PORT}`,
      )
    ) {
      throw error;
    }

    // No server responded, which is what we want.
  }
}

async function main() {
  let server:
    ChildProcess | null = null;

  console.log(
    "APPOPONI CHECK: preparing isolated database",
  );

  await ensurePortIsFree();

  try {
    await resetCheckDatabase();

    await command(
      tsxBin,
      [
        "src/scripts/migrate.ts",
      ],
      {
        env: {
          DATABASE_URL:
            checkDatabaseUrl,
        },
      },
    );

    await createCheckAdmin();

    server = spawn(
      tsxBin,
      ["src/server.ts"],
      {
        cwd: backendDir,
        env: {
          ...process.env,
          DATABASE_URL:
            checkDatabaseUrl,
          PORT:
            String(CHECK_PORT),
        },
        stdio: "inherit",
      },
    );

    await waitForServer(server);

    await command(
      tsxBin,
      [
        "src/scripts/familyCampCheck.ts",
      ],
      {
        env: {
          DATABASE_URL:
            checkDatabaseUrl,
          APPONI_API_URL:
            `http://localhost:${CHECK_PORT}`,
          APPONI_ADMIN_USERNAME:
            CHECK_ADMIN_USERNAME,
          APPONI_ADMIN_PASSWORD:
            CHECK_ADMIN_PASSWORD,
        },
      },
    );
  } finally {
    if (
      server &&
      server.exitCode === null
    ) {
      server.kill("SIGTERM");
      await delay(150);
    }

    await dropCheckDatabase();

    console.log(
      "APPOPONI CHECK: isolated database removed",
    );
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.stack
      : error,
  );

  process.exitCode = 1;
});
