import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  if (!database) database = drizzle(neon(url), { schema });
  return database;
}

export function hasDatabase() { return Boolean(process.env.DATABASE_URL); }
