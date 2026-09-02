import { Router } from "express";

import { pool } from "../db/pool.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const builderDataRouter = Router();

builderDataRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function tableExists(
  tableName: string,
): Promise<boolean> {
  const result = await pool.query<{
    exists: boolean;
  }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );

  return Boolean(
    result.rows[0]?.exists,
  );
}

function sanitizeValue(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (
    value &&
    typeof value === "object" &&
    !Buffer.isBuffer(value)
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    const output: Record<
      string,
      unknown
    > = {};

    for (const [
      key,
      nested,
    ] of Object.entries(source)) {
      if (
        key === "password_hash" ||
        key === "raw_content"
      ) {
        continue;
      }

      output[key] =
        sanitizeValue(nested);
    }

    return output;
  }

  if (Buffer.isBuffer(value)) {
    return "[binary data]";
  }

  return value;
}

builderDataRouter.get(
  "/tables",
  async (_req, res) => {
    try {
      const result =
        await pool.query<{
          table_name: string;
        }>(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `);

      const tables =
        await Promise.all(
          result.rows.map(
            async ({ table_name }) => {
              const count =
                await pool.query<{
                  count: string;
                }>(
                  `
                    SELECT COUNT(*)::text
                      AS count
                    FROM ${quoteIdentifier(
                      table_name,
                    )}
                  `,
                );

              return {
                name: table_name,
                row_count: Number(
                  count.rows[0]
                    ?.count ?? 0,
                ),
              };
            },
          ),
        );

      res.json({ tables });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load database tables",
      });
    }
  },
);

builderDataRouter.get(
  "/:table",
  async (req, res) => {
    const tableName =
      String(req.params.table);

    if (
      !(await tableExists(tableName))
    ) {
      res.status(404).json({
        error:
          "Database table does not exist",
      });
      return;
    }

    const parsedLimit =
      Number(req.query.limit ?? 100);

    const parsedOffset =
      Number(req.query.offset ?? 0);

    const limit =
      Number.isFinite(parsedLimit)
        ? Math.min(
            Math.max(
              Math.trunc(parsedLimit),
              1,
            ),
            200,
          )
        : 100;

    const offset =
      Number.isFinite(parsedOffset)
        ? Math.max(
            Math.trunc(parsedOffset),
            0,
          )
        : 0;

    const search =
      String(
        req.query.q ?? "",
      ).trim();

    try {
      const columnsResult =
        await pool.query<{
          column_name: string;
          data_type: string;
          is_nullable:
            | "YES"
            | "NO";
          column_default:
            | string
            | null;
        }>(
          `
            SELECT
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema =
              'public'
              AND table_name = $1
            ORDER BY
              ordinal_position
          `,
          [tableName],
        );

      const values: unknown[] = [];

      let where = "";

      if (search) {
        values.push(
          `%${search}%`,
        );

        where = `
          WHERE
            to_jsonb(t)::text
            ILIKE $1
        `;
      }

      const countResult =
        await pool.query<{
          count: string;
        }>(
          `
            SELECT
              COUNT(*)::text AS count
            FROM ${quoteIdentifier(
              tableName,
            )} t
            ${where}
          `,
          values,
        );

      const hasId =
        columnsResult.rows.some(
          (column) =>
            column.column_name ===
            "id",
        );

      const rowValues = [
        ...values,
        limit,
        offset,
      ];

      const limitParameter =
        `$${values.length + 1}`;

      const offsetParameter =
        `$${values.length + 2}`;

      const rowsResult =
        await pool.query<{
          row: Record<
            string,
            unknown
          >;
        }>(
          `
            SELECT
              to_jsonb(t) AS row
            FROM ${quoteIdentifier(
              tableName,
            )} t
            ${where}
            ${
              hasId
                ? 'ORDER BY t."id" DESC'
                : ""
            }
            LIMIT ${limitParameter}
            OFFSET ${offsetParameter}
          `,
          rowValues,
        );

      res.json({
        table: tableName,

        rows:
          rowsResult.rows.map(
            ({ row }) =>
              sanitizeValue(
                row,
              ),
          ),

        total: Number(
          countResult.rows[0]
            ?.count ?? 0,
        ),

        limit,
        offset,

        columns:
          columnsResult.rows.filter(
            (column) =>
              column.column_name !==
                "password_hash" &&
              column.column_name !==
                "raw_content",
          ),

        redacted_fields: [
          ...(tableName ===
          "accounts"
            ? ["password_hash"]
            : []),

          ...(tableName ===
          "import_batches"
            ? ["raw_content"]
            : []),

          ...(tableName ===
          "audit_log"
            ? [
                "password_hash inside audit values",
              ]
            : []),
        ],
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load database rows",
      });
    }
  },
);
