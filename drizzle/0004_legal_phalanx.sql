CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"image_path" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"credit" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "member_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "membership_tier" text DEFAULT 'profile' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "experience_years" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "height" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "measurements" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "hair_color" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "eye_color" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "specialties" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_profile_image_unique" ON "portfolio_items" USING btree ("profile_id","image_path");--> statement-breakpoint
CREATE INDEX "portfolio_profile_order_idx" ON "portfolio_items" USING btree ("profile_id","sort_order");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_member_unique" ON "profiles" USING btree ("member_id");