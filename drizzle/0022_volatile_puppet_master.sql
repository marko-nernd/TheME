ALTER TABLE "event_proposals" ALTER COLUMN "refund_days_before" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "refund_days_before" SET DEFAULT 60;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "no_refunds" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "passport_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "shoot_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "no_refunds" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "passport_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "shoot_types" jsonb DEFAULT '[]'::jsonb NOT NULL;