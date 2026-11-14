ALTER TYPE "public"."proposal_status" ADD VALUE 'deleted';--> statement-breakpoint
CREATE TABLE "event_deletion_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"proposal_id" uuid,
	"owner_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"snapshot" jsonb NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_model_spots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_photographer_spots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "rejection_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_model_spots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_photographer_spots" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "event_deletion_logs_event_idx" ON "event_deletion_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_deletion_logs_deleted_idx" ON "event_deletion_logs" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "event_proposals" ADD CONSTRAINT "event_proposals_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;