import type {
  QueryResult,
  QueryResultRow,
} from "pg";

import {
  getAuditActorAccountId,
} from "./auditContext.js";

import { pool } from "./pool.js";

export async function query<
  T extends QueryResultRow = QueryResultRow,
>(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  const actorAccountId =
    getAuditActorAccountId();

  if (!actorAccountId) {
    return pool.query<T>(text, values);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        SELECT set_config(
          'appoponi.actor_account_id',
          $1,
          true
        )
      `,
      [actorAccountId],
    );

    const result =
      await client.query<T>(
        text,
        values,
      );

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
