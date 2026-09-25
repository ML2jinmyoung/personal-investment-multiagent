import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/app.db";
if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true });

export const db = drizzle(createClient({ url }), { schema });

let migrated: Promise<void> | undefined;

/** Returns the db after applying pending migrations once per process. */
export async function getDb() {
  await (migrated ??= migrate(db, { migrationsFolder: "./drizzle" }));
  return db;
}

export { schema };
