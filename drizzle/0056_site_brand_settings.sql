CREATE TABLE "site_brand_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "platform_name" text DEFAULT 'Model Escape' NOT NULL,
  "short_name" text DEFAULT 'MODEL ESCAPE' NOT NULL,
  "logo_path" text DEFAULT '' NOT NULL,
  "favicon_path" text DEFAULT '/favicon.svg' NOT NULL,
  "share_image_path" text DEFAULT '/og.png' NOT NULL,
  "primary_color" text DEFAULT '#ff2d95' NOT NULL,
  "dark_color" text DEFAULT '#11110f' NOT NULL,
  "light_color" text DEFAULT '#f1efe8' NOT NULL,
  "text_color" text DEFAULT '#11110f' NOT NULL,
  "muted_color" text DEFAULT '#7d7b72' NOT NULL,
  "success_color" text DEFAULT '#16834f' NOT NULL,
  "warning_color" text DEFAULT '#b68118' NOT NULL,
  "danger_color" text DEFAULT '#a31616' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
