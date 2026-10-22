ALTER TABLE "contact_request" ADD COLUMN "ip_hash" text;--> statement-breakpoint
CREATE INDEX "contact_request_ip_hash_idx" ON "contact_request" USING btree ("ip_hash","created_at");