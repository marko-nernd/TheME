import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDatabase = globalThis as unknown as {
  modelEscapePool?: Pool;
};

const connectionString =
  process.env.DATABASE_URL;

export const pool =
  globalForDatabase.modelEscapePool ??
  new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.modelEscapePool = pool;
}

export const db = drizzle(pool, { schema });
