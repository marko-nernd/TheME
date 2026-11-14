CREATE TABLE "site_page_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" text NOT NULL,
	"eyebrow" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"image_path" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bust_size" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "waist_inches" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "hip_inches" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "site_page_settings_page_key_unique" ON "site_page_settings" USING btree ("page_key");