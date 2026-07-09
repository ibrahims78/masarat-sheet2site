/**
 * Atomically inserts a project record with a deduplicated sequential number.
 * Uses a per-project advisory lock inside a transaction to prevent duplicate
 * sequential_number values under concurrent submissions.
 *
 * The optional `postInsert` callback runs inside the same transaction before
 * COMMIT, so any failure rolls back the record insert as well — preventing
 * orphaned records when the caller needs to update related rows atomically.
 */
import { pool } from "../db.js";
import type { PoolClient } from "pg";

export interface InsertedRecord {
  id: string;
  sequential_number: number;
  edit_token: string;
  sheets_row_index: number | null;
  submitted_at: string;
  enriched_data: Record<string, any>;
}

export async function insertRecordAtomic(
  projectId: string,
  data: object,
  tokenExpiresAt: Date,
  autoIncrementKeys: string[] = [],
  postInsert?: (client: PoolClient, recordId: string) => Promise<void>
): Promise<InsertedRecord> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Acquire a per-project advisory lock for the duration of this transaction.
    // hashtext() maps the UUID string to an int4, giving a project-scoped lock.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [projectId]);

    const { rows: seqRows } = await client.query(
      "SELECT COALESCE(MAX(sequential_number), 0) + 1 AS seq FROM project_records WHERE project_id = $1",
      [projectId]
    );
    const seqNum: number = Number(seqRows[0].seq);

    // Auto-fill autoincrement fields with the same value as sequentialNumber.
    // This ensures a single source of truth — no separate counter per field.
    const enrichedData: Record<string, any> = { ...(data as Record<string, any>) };
    for (const key of autoIncrementKeys) {
      enrichedData[key] = String(seqNum);
    }

    const { rows } = await client.query<Omit<InsertedRecord, "enriched_data">>(
      `INSERT INTO project_records
         (id, project_id, data, sequential_number, edit_token, token_expires_at, submitted_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), $4, NOW())
       RETURNING id, sequential_number, edit_token, sheets_row_index, submitted_at`,
      [projectId, JSON.stringify(enrichedData), seqNum, tokenExpiresAt]
    );

    // Run caller-supplied post-insert work inside the same transaction
    // so that any failure rolls back the record insert atomically.
    if (postInsert) {
      await postInsert(client, rows[0].id);
    }

    await client.query("COMMIT");
    return { ...rows[0], enriched_data: enrichedData };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
