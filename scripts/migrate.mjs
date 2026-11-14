import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const pool = new Pool({ connectionString, max: 1 });
const database = drizzle(pool);

try {
  await migrate(database, { migrationsFolder: "drizzle" });
  console.log("Database migrations are current.");
} finally {
  await pool.end();
}
