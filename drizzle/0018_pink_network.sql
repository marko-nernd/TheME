CREATE TABLE "member_name_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"previous_name" text NOT NULL,
	"new_name" text NOT NULL,
	"previous_username" text,
	"new_username" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_participations" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "event_participations" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "member_name_changes" ADD CONSTRAINT "member_name_changes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_name_changes_member_changed_idx" ON "member_name_changes" USING btree ("member_id","changed_at");