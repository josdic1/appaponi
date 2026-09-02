import {
  createHash,
} from "node:crypto";

import { Router } from "express";

import {
  parse as parseDelimited,
} from "csv-parse/sync";

import * as XLSX from "xlsx";

import { pool } from "../db/pool.js";

import {
  requireAccountType,
  requireAuth,
  requirePasswordChanged,
} from "../middleware/auth.js";

export const builderImportRouter =
  Router();

builderImportRouter.use(
  requireAuth,
  requirePasswordChanged,
  requireAccountType("admin"),
);

const sourceTypes = new Set([
  "json",
  "csv",
  "tsv",
  "text",
  "excel",
  "pdf",
  "other",
]);

type SourceType =
  | "json"
  | "csv"
  | "tsv"
  | "text"
  | "excel"
  | "pdf"
  | "other";

function objectRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return { value };
}

function parseSource(
  sourceType: SourceType,
  rawText: string | null,
  rawBuffer: Buffer | null,
): Record<string, unknown>[] {
  if (sourceType === "json") {
    if (!rawText) {
      throw new Error(
        "JSON source is empty",
      );
    }

    const parsed =
      JSON.parse(rawText);

    if (Array.isArray(parsed)) {
      return parsed.map(
        objectRecord,
      );
    }

    return [
      objectRecord(parsed),
    ];
  }

  if (
    sourceType === "csv" ||
    sourceType === "tsv"
  ) {
    if (!rawText) {
      throw new Error(
        "Delimited source is empty",
      );
    }

    return parseDelimited(
      rawText,
      {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
        delimiter:
          sourceType === "tsv"
            ? "\t"
            : ",",
      },
    ) as Record<
      string,
      unknown
    >[];
  }

  if (
    sourceType === "excel"
  ) {
    if (!rawBuffer) {
      throw new Error(
        "Excel source is empty",
      );
    }

    const workbook =
      XLSX.read(rawBuffer, {
        type: "buffer",
      });

    const records:
      Record<
        string,
        unknown
      >[] = [];

    for (
      const sheetName of
      workbook.SheetNames
    ) {
      const sheet =
        workbook.Sheets[
          sheetName
        ];

      const rows =
        XLSX.utils.sheet_to_json<
          Record<
            string,
            unknown
          >
        >(sheet, {
          defval: null,
          raw: true,
        });

      for (const row of rows) {
        records.push({
          __sheet: sheetName,
          ...row,
        });
      }
    }

    return records;
  }

  if (
    sourceType === "text" ||
    sourceType === "other"
  ) {
    if (!rawText) {
      throw new Error(
        "Text source is empty",
      );
    }

    return [
      {
        text: rawText,
      },
    ];
  }

  throw new Error(
    `${sourceType} parsing is not connected yet`,
  );
}

builderImportRouter.get(
  "/batches",
  async (_req, res) => {
    try {
      const result =
        await pool.query(
          `
            SELECT
              ib.id,
              ib.source_name,
              ib.source_type,
              ib.status,
              ib.mime_type,
              ib.source_sha256,
              ib.source_metadata,
              ib.created_at,
              ib.updated_at,

              (
                SELECT COUNT(*)::int
                FROM import_records ir
                WHERE
                  ir.import_batch_id =
                    ib.id
              ) AS record_count,

              (
                SELECT COUNT(*)::int
                FROM import_issues ii
                WHERE
                  ii.import_batch_id =
                    ib.id
              ) AS issue_count

            FROM import_batches ib
            ORDER BY ib.id DESC
            LIMIT 100
          `,
        );

      res.json({
        batches:
          result.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load import batches",
      });
    }
  },
);

builderImportRouter.get(
  "/batches/:id",
  async (req, res) => {
    const id =
      Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      res.status(400).json({
        error:
          "Invalid import batch id",
      });
      return;
    }

    try {
      const batchResult =
        await pool.query(
          `
            SELECT
              id,
              source_name,
              source_type,
              status,
              mime_type,
              source_sha256,
              parsed_payload,
              source_metadata,
              created_at,
              updated_at
            FROM import_batches
            WHERE id = $1
          `,
          [id],
        );

      if (
        !batchResult.rows[0]
      ) {
        res.status(404).json({
          error:
            "Import batch does not exist",
        });
        return;
      }

      const recordsResult =
        await pool.query(
          `
            SELECT
              id,
              source_index,
              raw_record,
              normalized_record,
              target_table,
              mapped_record,
              status,
              validation_errors,
              committed_at,
              created_at,
              updated_at
            FROM import_records
            WHERE
              import_batch_id = $1
            ORDER BY source_index
            LIMIT 1000
          `,
          [id],
        );

      const issuesResult =
        await pool.query(
          `
            SELECT
              id,
              import_record_id,
              issue_type,
              source_key,
              source_value,
              suggested_target,
              resolution,
              status,
              created_at,
              updated_at
            FROM import_issues
            WHERE
              import_batch_id = $1
            ORDER BY id
          `,
          [id],
        );

      res.json({
        batch:
          batchResult.rows[0],

        records:
          recordsResult.rows,

        issues:
          issuesResult.rows,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          "Could not load import batch",
      });
    }
  },
);

builderImportRouter.post(
  "/stage",
  async (req, res) => {
    const sourceName =
      String(
        req.body?.source_name ??
          "",
      ).trim();

    const sourceType =
      String(
        req.body?.source_type ??
          "",
      ).trim() as SourceType;

    const mimeType =
      req.body?.mime_type
        ? String(
            req.body.mime_type,
          )
        : null;

    const rawText =
      typeof req.body?.raw_text ===
      "string"
        ? req.body.raw_text
        : null;

    const rawBase64 =
      typeof req.body
        ?.raw_base64 ===
      "string"
        ? req.body.raw_base64
        : null;

    if (!sourceName) {
      res.status(400).json({
        error:
          "Source name is required",
      });
      return;
    }

    if (
      !sourceTypes.has(
        sourceType,
      )
    ) {
      res.status(400).json({
        error:
          "Invalid source type",
      });
      return;
    }

    const rawBuffer =
      rawBase64
        ? Buffer.from(
            rawBase64,
            "base64",
          )
        : null;

    const sourceBytes =
      rawBuffer ??
      Buffer.from(
        rawText ?? "",
        "utf8",
      );

    const sha256 =
      createHash("sha256")
        .update(sourceBytes)
        .digest("hex");

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN",
      );

      await client.query(
        `
          SELECT set_config(
            'appoponi.actor_account_id',
            $1,
            true
          )
        `,
        [req.auth!.sub],
      );

      const batchResult =
        await client.query<{
          id: string;
        }>(
          `
            INSERT INTO import_batches (
              source_name,
              source_type,
              status,
              mime_type,
              source_sha256,
              raw_content,
              raw_text,
              source_metadata
            )
            VALUES (
              $1,
              $2,
              'raw',
              $3,
              $4,
              $5,
              $6,
              $7::jsonb
            )
            RETURNING id
          `,
          [
            sourceName,
            sourceType,
            mimeType,
            sha256,
            rawBuffer,
            rawText,
            JSON.stringify({
              byte_length:
                sourceBytes.length,
            }),
          ],
        );

      const batchId =
        batchResult.rows[0].id;

      try {
        const records =
          parseSource(
            sourceType,
            rawText,
            rawBuffer,
          );

        for (
          let index = 0;
          index < records.length;
          index += 1
        ) {
          await client.query(
            `
              INSERT INTO import_records (
                import_batch_id,
                source_index,
                raw_record,
                status
              )
              VALUES (
                $1,
                $2,
                $3::jsonb,
                'pending'
              )
            `,
            [
              batchId,
              index,
              JSON.stringify(
                records[index],
              ),
            ],
          );
        }

        await client.query(
          `
            UPDATE import_batches
            SET
              status = 'parsed',
              parsed_payload =
                $2::jsonb
            WHERE id = $1
          `,
          [
            batchId,
            JSON.stringify({
              record_count:
                records.length,
            }),
          ],
        );

        await client.query(
          "COMMIT",
        );

        res.status(201).json({
          ok: true,
          batch_id:
            batchId,
          record_count:
            records.length,
        });
      } catch (parseError) {
        const message =
          parseError instanceof
          Error
            ? parseError.message
            : "Could not parse source";

        await client.query(
          `
            UPDATE import_batches
            SET status = 'failed'
            WHERE id = $1
          `,
          [batchId],
        );

        await client.query(
          `
            INSERT INTO import_issues (
              import_batch_id,
              issue_type,
              source_value,
              status
            )
            VALUES (
              $1,
              'parse_error',
              $2::jsonb,
              'open'
            )
          `,
          [
            batchId,
            JSON.stringify({
              message,
            }),
          ],
        );

        await client.query(
          "COMMIT",
        );

        res.status(422).json({
          error: message,
          batch_id:
            batchId,
        });
      }
    } catch (error) {
      await client.query(
        "ROLLBACK",
      );

      console.error(error);

      res.status(500).json({
        error:
          "Could not stage import source",
      });
    } finally {
      client.release();
    }
  },
);
