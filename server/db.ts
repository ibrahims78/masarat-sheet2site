import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// Only enable SSL when the connection string explicitly requests it,
// and always verify certificates (rejectUnauthorized: true is the default).
const sslConfig = process.env.DATABASE_URL?.includes("sslmode=require") ||
  process.env.DATABASE_URL?.includes("ssl=true")
    ? true   // use Node's default: verify server cert
    : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });
export { pool };
