CREATE TYPE "public"."capture_kind" AS ENUM('text', 'url', 'image');--> statement-breakpoint
CREATE TYPE "public"."run_outcome" AS ENUM('succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('up', 'down', 'none');--> statement-breakpoint
CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "capture_kind" NOT NULL,
	"raw_text" text,
	"image_paths" text[] DEFAULT '{}' NOT NULL,
	"source_url" text,
	"source_type" text,
	"content_hash" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "captures_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capture_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"outcome" "run_outcome" NOT NULL,
	"error" text,
	"verdict" "verdict" DEFAULT 'none' NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE no action ON UPDATE no action;