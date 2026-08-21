import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

loadEnvFile(".env.local");

export default defineConfig({ out: "./drizzle", schema: "./db/schema.ts", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL! }, strict: true });

