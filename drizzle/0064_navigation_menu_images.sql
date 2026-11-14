ALTER TABLE "site_brand_settings" ADD COLUMN IF NOT EXISTS "menu_events_image_path" text NOT NULL DEFAULT '/images/desert-production.png';
--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN IF NOT EXISTS "menu_community_image_path" text NOT NULL DEFAULT '/images/poolside-network.png';
--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN IF NOT EXISTS "menu_host_image_path" text NOT NULL DEFAULT '/images/creative-planning.png';
