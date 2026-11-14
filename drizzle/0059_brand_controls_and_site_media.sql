ALTER TABLE "site_brand_settings" ADD COLUMN "heading_color" text DEFAULT '#11110f' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "body_text_color" text DEFAULT '#11110f' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "header_background_color" text DEFAULT '#11110f' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "header_text_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "surface_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "input_background_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "input_text_color" text DEFAULT '#11110f' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "input_focus_color" text DEFAULT '#ff2d95' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "link_color" text DEFAULT '#a90053' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "link_hover_color" text DEFAULT '#ff2d95' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "border_color" text DEFAULT '#d7d4cb' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "button_background_color" text DEFAULT '#ff2d95' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "button_text_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "button_hover_color" text DEFAULT '#d90072' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "button_radius" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "dropdown_background_color" text DEFAULT '#1a1a18' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "dropdown_text_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "dropdown_hover_color" text DEFAULT '#ff2d95' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "body_font_size" text DEFAULT '16' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_brand_settings" ADD COLUMN "body_line_height" text DEFAULT '26' NOT NULL;--> statement-breakpoint
CREATE TABLE "site_media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "data" bytea NOT NULL,
  "size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "uploaded_by_admin_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "site_media_assets" ADD CONSTRAINT "site_media_assets_uploaded_by_admin_id_admin_accounts_id_fk" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "public"."admin_accounts"("id") ON DELETE set null ON UPDATE no action;
