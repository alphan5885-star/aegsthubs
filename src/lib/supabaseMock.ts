import { createServerFn } from "@tanstack/react-start";

let pool: any = null;
let postgresClient: any = null;
let envLoaded = false;
const isBrowser = typeof window !== "undefined";

async function loadEnv() {
  if (isBrowser || envLoaded) return;

  try {
    const dotenv = await import("dotenv");
    const path = await import("path");
    const fs = await import("fs");

    const envPath = path.resolve(".env");
    const envLocalPath = path.resolve(".env.local");

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true });
    }
  } catch (e) {
    console.warn("[supabaseMock] Failed to load .env files:", e);
  } finally {
    envLoaded = true;
  }
}

async function getPool() {
  if (isBrowser) {
    throw new Error("Database pool unavailable in browser environment");
  }

  if (!pool) {
    await loadEnv();

    if (!postgresClient) {
      const postgresModule = await import("postgres");
      postgresClient = postgresModule.default ?? postgresModule;
    }

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.error("[PostgreSQL] DATABASE_URL not set");
      throw new Error("DATABASE_URL environment variable is required");
    }

    pool = postgresClient(DATABASE_URL, {
      max: 10,
      idle_timeout: 30,
    });
  }

  return pool;
}

// A generic function to handle PostgreSQL queries
export const genericQueryFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { table: string; action: string; query?: any; body?: any }) => data,
  )
  .handler(async (ctx) => {
    const { table, action, query, body } = ctx.data;

    try {
      const pg = await getPool();

      if (action === "select") {
        let sqlQuery = `SELECT * FROM ${table}`;
        const params: any[] = [];
        let paramIndex = 1;

        if (query && query.eq) {
          const conditions = Object.keys(query.eq).map((k) => {
            params.push(query.eq[k]);
            return `${k} = $${paramIndex++}`;
          });
          sqlQuery += ` WHERE ` + conditions.join(" AND ");
        }

        const result = await pg.unsafe(sqlQuery, params);
        return { data: result, error: null };
      } else if (action === "insert") {
        const keys = Object.keys(body);
        const values = Object.values(body);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const sqlQuery = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`;

        const result = await pg.unsafe(sqlQuery, values);
        return { data: result[0] || { id: null, ...body }, error: null };
      } else if (action === "update") {
        const keys = Object.keys(body);
        const values = Object.values(body);
        const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
        let sqlQuery = `UPDATE ${table} SET ${setString}`;

        if (query && query.eq) {
          const conditions = Object.keys(query.eq).map((k, i) => {
            values.push(query.eq[k]);
            return `${k} = $${keys.length + i + 1}`;
          });
          sqlQuery += ` WHERE ` + conditions.join(" AND ");
        }

        await pg.unsafe(sqlQuery, values);
        return { data: body, error: null };
      }

      return { data: null, error: "Action not supported in generic mock" };
    } catch (e: any) {
      console.error("[PostgreSQL Error]", e);
      return { data: null, error: { message: e.message } };
    }
  });

export const genericRpcFn = createServerFn({ method: "POST" })
  .inputValidator((data: { fn: string; args: any }) => data)
  .handler(async (ctx) => {
    const { fn, args } = ctx.data;

    try {
      const pg = await getPool();
      // TODO: Implement specific RPC functions as needed
      // For now, return success
      return { data: { success: true }, error: null };
    } catch (e: any) {
      console.error("[PostgreSQL RPC Error]", e);
      return { data: null, error: { message: e.message } };
    }
  });
