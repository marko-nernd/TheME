ALTER TABLE "billing_customers" ADD COLUMN "member_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "avatar_data" "bytea";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "avatar_mime" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "avatar_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "billing_customers"
SET "member_id" = "members"."id"
FROM "members"
WHERE lower("billing_customers"."email") = lower("members"."email");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_member_unique" ON "billing_customers" USING btree ("member_id");
