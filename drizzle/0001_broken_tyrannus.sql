CREATE TYPE "public"."proposal_role" AS ENUM('organizer', 'promoter', 'model');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('submitted', 'reviewing', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "event_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "proposal_role" NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"organization" text,
	"title" text NOT NULL,
	"event_type" text NOT NULL,
	"location" text NOT NULL,
	"timing" text NOT NULL,
	"venue_status" text NOT NULL,
	"expected_attendance" integer NOT NULL,
	"budget_band" text NOT NULL,
	"funding_source" text NOT NULL,
	"support_needed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"concept" text NOT NULL,
	"status" "proposal_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "event_proposals_status_created_idx" ON "event_proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "event_proposals_email_idx" ON "event_proposals" USING btree ("contact_email");