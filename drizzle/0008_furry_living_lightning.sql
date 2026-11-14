CREATE TYPE "public"."participation_status" AS ENUM('pending', 'approved', 'awaiting_payment', 'confirmed', 'declined', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "event_participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"path_type" text NOT NULL,
	"status" "participation_status" DEFAULT 'pending' NOT NULL,
	"applicant_name" text NOT NULL,
	"applicant_email" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"sponsor_amount_cents" integer,
	"stripe_checkout_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_type_policies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "event_type_policies" CASCADE;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "member_id" uuid;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "state_code" text;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "refund_days_before" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "refund_terms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "participation_paths" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "state_code" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "refund_days_before" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "refund_terms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "participation_paths" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "state_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_participations_event_member_path_unique" ON "event_participations" USING btree ("event_id","member_id","path_type");--> statement-breakpoint
CREATE INDEX "event_participations_event_status_idx" ON "event_participations" USING btree ("event_id","status");--> statement-breakpoint
ALTER TABLE "event_proposals" ADD CONSTRAINT "event_proposals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;