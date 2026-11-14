ALTER TABLE "event_proposals" ADD COLUMN "hotel_models_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "hotel_photographers_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_models_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "villa_photographers_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "hotel_models_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "hotel_photographers_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_models_allowed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "villa_photographers_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "event_proposals" SET
  "hotel_models_allowed" = true,
  "hotel_photographers_allowed" = "hotel_available",
  "villa_models_allowed" = true,
  "villa_photographers_allowed" = "villa_available" AND "villa_photographer_spots" > 0;--> statement-breakpoint
UPDATE "events" SET
  "hotel_models_allowed" = true,
  "hotel_photographers_allowed" = "hotel_available",
  "villa_models_allowed" = true,
  "villa_photographers_allowed" = "villa_available" AND "villa_photographer_spots" > 0;
