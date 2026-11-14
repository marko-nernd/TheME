CREATE TABLE "sponsor_tier_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"requested_level" text NOT NULL,
	"previous_level" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sponsorship_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"organizer_member_id" uuid,
	"sponsor_member_id" uuid,
	"terms" text DEFAULT '' NOT NULL,
	"cash_amount_cents" integer DEFAULT 0 NOT NULL,
	"contribution_type" text DEFAULT 'in_kind' NOT NULL,
	"organizer_accepted_at" timestamp with time zone,
	"sponsor_accepted_at" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "logo_data" "bytea";--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "logo_mime" text;--> statement-breakpoint
ALTER TABLE "sponsors" ADD COLUMN "logo_filename" text;--> statement-breakpoint
ALTER TABLE "sponsor_tier_change_requests" ADD CONSTRAINT "sponsor_tier_change_requests_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_tier_change_requests" ADD CONSTRAINT "sponsor_tier_change_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD CONSTRAINT "sponsorship_agreements_request_id_sponsorship_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."sponsorship_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD CONSTRAINT "sponsorship_agreements_organizer_member_id_members_id_fk" FOREIGN KEY ("organizer_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD CONSTRAINT "sponsorship_agreements_sponsor_member_id_members_id_fk" FOREIGN KEY ("sponsor_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sponsor_tier_member_status_idx" ON "sponsor_tier_change_requests" USING btree ("member_id","status");--> statement-breakpoint
CREATE INDEX "sponsor_tier_sponsor_status_idx" ON "sponsor_tier_change_requests" USING btree ("sponsor_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsorship_agreement_request_unique" ON "sponsorship_agreements" USING btree ("request_id");