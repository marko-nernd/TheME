ALTER TABLE "portfolio_items" ADD COLUMN "image_data" "bytea";--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "image_mime" text;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;