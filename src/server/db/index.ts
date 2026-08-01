import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";
import * as apiKeysSchema from "./user-api-keys";


const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

export const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema: { ...schema, ...authSchema, ...apiKeysSchema } });
