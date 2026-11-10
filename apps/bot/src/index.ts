import { schema } from "@interview-intel/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createWorker } from "./worker";

export default createWorker((env) => {
  // prepare: false for Supabase's transaction pooler.
  const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });
  return { db: drizzle(sql, { schema }), close: () => sql.end() };
});
