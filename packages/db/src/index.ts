import type { NewCapture } from "@interview-intel/domain";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export { schema };
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Saves a Capture once. Returns "duplicate" if one with the same content hash already exists. */
export async function saveCapture(db: Db, capture: NewCapture): Promise<"created" | "duplicate"> {
  const inserted = await db
    .insert(schema.captures)
    .values(capture)
    .onConflictDoNothing({ target: schema.captures.contentHash })
    .returning({ id: schema.captures.id });
  return inserted.length > 0 ? "created" : "duplicate";
}
