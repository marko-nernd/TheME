ALTER TABLE "sponsorship_requests" ADD COLUMN "response_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "response_member_id" uuid;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD CONSTRAINT "sponsorship_requests_response_member_id_members_id_fk" FOREIGN KEY ("response_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "sponsorship_requests" SET "response_member_id" = "requester_member_id" WHERE "response_member_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "payment_status" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "in_kind_status" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "fulfillment_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "sponsor_delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "recipient_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "sponsorship_agreements" SET "payment_status" = 'pending' WHERE "contribution_type" IN ('cash','hybrid') AND "cash_amount_cents" > 0;--> statement-breakpoint
UPDATE "sponsorship_agreements" SET "in_kind_status" = 'pending' WHERE "contribution_type" IN ('in_kind','hybrid');--> statement-breakpoint
CREATE UNIQUE INDEX "sponsorship_agreement_payment_intent_unique" ON "sponsorship_agreements" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE TABLE "sponsorship_request_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" uuid NOT NULL,
  "sender_member_id" uuid,
  "sender_name" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "sponsorship_request_messages" ADD CONSTRAINT "sponsorship_request_messages_request_id_sponsorship_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."sponsorship_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_request_messages" ADD CONSTRAINT "sponsorship_request_messages_sender_member_id_members_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sponsorship_request_messages_request_created_idx" ON "sponsorship_request_messages" USING btree ("request_id","created_at");
