CREATE TABLE "site_page_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_page_settings" ADD COLUMN "seo_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_page_settings" ADD COLUMN "seo_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_page_settings" ADD COLUMN "share_image_path" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_page_revisions" ADD CONSTRAINT "site_page_revisions_admin_id_admin_accounts_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_page_revisions_page_created_idx" ON "site_page_revisions" USING btree ("page_key","created_at");