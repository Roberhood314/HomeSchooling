import { Pool } from "pg";

declare global {
  var __aiHomeSchoolPool: Pool | undefined;
}

export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!global.__aiHomeSchoolPool) {
    global.__aiHomeSchoolPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: false,
    });
  }
  return global.__aiHomeSchoolPool;
}

export async function dbHealth() {
  const result = await db().query("SELECT NOW() AS now");
  return result.rows[0];
}
