CREATE TABLE "profile_contact_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viewer_member_id" uuid,
	"target_member_id" uuid,
	"action" text NOT NULL,
	"context_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_bust_size" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_waist" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_hips" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_contact_audits" ADD CONSTRAINT "profile_contact_audits_viewer_member_id_members_id_fk" FOREIGN KEY ("viewer_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_contact_audits" ADD CONSTRAINT "profile_contact_audits_target_member_id_members_id_fk" FOREIGN KEY ("target_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_contact_viewer_created_idx" ON "profile_contact_audits" USING btree ("viewer_member_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_contact_target_created_idx" ON "profile_contact_audits" USING btree ("target_member_id","created_at");