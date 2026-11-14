ALTER TABLE "sponsorship_requests" ADD COLUMN "contribution_type" text DEFAULT 'in_kind' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "cash_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsorship_requests" ADD COLUMN "offer_details" text DEFAULT '' NOT NULL;