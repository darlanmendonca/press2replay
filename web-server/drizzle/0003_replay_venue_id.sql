DROP INDEX "replay_court_created_idx";--> statement-breakpoint
ALTER TABLE "replay" ADD COLUMN "venue_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "replay_court_created_idx" ON "replay" USING btree ("venue_id","court_id","created_at");