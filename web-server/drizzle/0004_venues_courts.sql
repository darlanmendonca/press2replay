CREATE TABLE "court" (
	"venue_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"sport" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "court_venue_id_id_pk" PRIMARY KEY("venue_id","id")
);
--> statement-breakpoint
CREATE TABLE "venue" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"edge_key_hash" text,
	"edge_key_created_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_edge_key_hash_unique" UNIQUE("edge_key_hash")
);
--> statement-breakpoint
ALTER TABLE "court" ADD CONSTRAINT "court_venue_id_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venue"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay" DROP COLUMN "venue_name";