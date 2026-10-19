ALTER TABLE "replay" ADD COLUMN "camera_id" text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE "replay" ADD COLUMN "moment_id" uuid DEFAULT gen_random_uuid() NOT NULL;