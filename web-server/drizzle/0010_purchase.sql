CREATE TABLE "purchase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_session_id" text NOT NULL,
	"plan" text NOT NULL,
	"venue_id" text NOT NULL,
	"court_id" text NOT NULL,
	"replay_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "purchase_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE INDEX "purchase_email_idx" ON "purchase" USING btree ("email");