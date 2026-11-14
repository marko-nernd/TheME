ALTER TABLE "event_proposals" ADD COLUMN "media_type" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "media_data" "bytea";--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "media_mime" text;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "poster_data" "bytea";--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "poster_mime" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "media_type" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "media_data" "bytea";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "media_mime" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "poster_data" "bytea";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "poster_mime" text;