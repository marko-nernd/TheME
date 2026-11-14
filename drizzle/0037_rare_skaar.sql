ALTER TABLE "sponsorship_agreements" ADD COLUMN "beneficiary_member_id" uuid;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "beneficiary_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "target_member_id" uuid;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "flight_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "hotel_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "representation_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "representation_terms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD CONSTRAINT "sponsorship_agreements_beneficiary_member_id_members_id_fk" FOREIGN KEY ("beneficiary_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD CONSTRAINT "sponsorship_requests_target_member_id_members_id_fk" FOREIGN KEY ("target_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;