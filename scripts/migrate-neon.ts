import { loadEnvFile } from "node:process";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { getDatabase } from "../lib/db/client";

loadEnvFile(".env.local");

await migrate(getDatabase(), { migrationsFolder: "./drizzle" });
console.log("Neon migrations applied successfully.");
process.exit(0);
