ALTER TABLE "event_proposals" ADD COLUMN "intro_sentence" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "full_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "intro_sentence" text DEFAULT '' NOT NULL;