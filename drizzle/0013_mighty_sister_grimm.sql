CREATE TABLE "identity_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid,
	"admin_id" uuid,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"reviewer_member_id" uuid NOT NULL,
	"reviewed_member_id" uuid NOT NULL,
	"overall_rating" integer NOT NULL,
	"reliability_rating" integer NOT NULL,
	"professionalism_rating" integer NOT NULL,
	"would_work_again" boolean NOT NULL,
	"no_show" boolean DEFAULT false NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_active_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "inactivity_reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "final_warning_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "account_deletion_scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "identity_audit_logs" ADD CONSTRAINT "identity_audit_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_reviews" ADD CONSTRAINT "member_reviews_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_reviews" ADD CONSTRAINT "member_reviews_reviewer_member_id_members_id_fk" FOREIGN KEY ("reviewer_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_reviews" ADD CONSTRAINT "member_reviews_reviewed_member_id_members_id_fk" FOREIGN KEY ("reviewed_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_audit_member_created_idx" ON "identity_audit_logs" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "identity_audit_action_idx" ON "identity_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "member_reviews_event_reviewer_reviewed_unique" ON "member_reviews" USING btree ("event_id","reviewer_member_id","reviewed_member_id");--> statement-breakpoint
CREATE INDEX "member_reviews_reviewed_status_idx" ON "member_reviews" USING btree ("reviewed_member_id","status");--> statement-breakpoint
CREATE INDEX "member_reviews_event_idx" ON "member_reviews" USING btree ("event_id");