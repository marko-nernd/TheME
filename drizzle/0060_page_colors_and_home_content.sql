ALTER TABLE "site_page_settings" ADD COLUMN "header_background_color" text DEFAULT '#11110f' NOT NULL;
ALTER TABLE "site_page_settings" ADD COLUMN "content" jsonb DEFAULT '{}'::jsonb NOT NULL;
