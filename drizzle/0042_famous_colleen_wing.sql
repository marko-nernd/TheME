ALTER TABLE "event_proposals" ADD COLUMN "villa_model_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_photographer_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_model_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_photographer_price_cents" integer DEFAULT 0 NOT NULL;