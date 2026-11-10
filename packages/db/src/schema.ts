import { CAPTURE_KINDS } from "@interview-intel/domain";
import { integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const captureKind = pgEnum("capture_kind", CAPTURE_KINDS);
export const runOutcome = pgEnum("run_outcome", ["succeeded", "failed"]);
export const verdict = pgEnum("verdict", ["up", "down", "none"]);

/** Write-once: no status column, no updates (ADR-0002). */
export const captures = pgTable("captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: captureKind("kind").notNull(),
  rawText: text("raw_text"),
  imagePaths: text("image_paths").array().notNull().default([]),
  sourceUrl: text("source_url"),
  sourceType: text("source_type"),
  contentHash: text("content_hash").notNull().unique(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extractionRuns = pgTable("extraction_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  captureId: uuid("capture_id").notNull().references(() => captures.id),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  outcome: runOutcome("outcome").notNull(),
  error: text("error"),
  verdict: verdict("verdict").notNull().default("none"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
