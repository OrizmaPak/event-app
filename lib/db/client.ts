import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import WebSocket from "ws";
import * as schema from "@/db/schema";

neonConfig.poolQueryViaFetch = true;

function createDatabase(url: string) {
  if (typeof globalThis.WebSocket === "undefined") neonConfig.webSocketConstructor = WebSocket;
  const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 30_000, idleTimeoutMillis: 1_000 });
  return drizzle({ client: pool, schema });
}

const globalForDatabase = globalThis as typeof globalThis & {
  nasaEventDatabase?: ReturnType<typeof createDatabase>;
};

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  globalForDatabase.nasaEventDatabase ??= createDatabase(url);
  return globalForDatabase.nasaEventDatabase;
}

export function hasDatabase() { return Boolean(process.env.DATABASE_URL); }
