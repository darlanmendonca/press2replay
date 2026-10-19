CREATE TABLE "replay" (
	"id" uuid PRIMARY KEY NOT NULL,
	"court_id" text NOT NULL,
	"venue_name" text NOT NULL,
	"sport" text NOT NULL,
	"video_path" text NOT NULL,
	"sprite_path" text,
	"sprite_frames" integer,
	"sprite_columns" integer,
	"duration_seconds" integer,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "replay_court_created_idx" ON "replay" USING btree ("court_id","created_at");--> statement-breakpoint
CREATE INDEX "replay_expires_idx" ON "replay" USING btree ("expires_at");