ALTER TABLE "event_participations" ADD COLUMN "accommodation_type" text;--> statement-breakpoint
ALTER TABLE "event_participations" ADD COLUMN "accommodation_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "hotel_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "hotel_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "airport_info" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "flight_instructions" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "hotel_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "hotel_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "airport_info" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "flight_instructions" text DEFAULT '' NOT NULL;