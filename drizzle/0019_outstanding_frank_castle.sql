CREATE TABLE "event_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"participation_id" uuid,
	"member_id" uuid,
	"host_member_id" uuid,
	"stripe_checkout_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"gross_cents" integer NOT NULL,
	"platform_fee_cents" integer NOT NULL,
	"host_net_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "external_event_url" text;--> statement-breakpoint
ALTER TABLE "event_proposals" ADD COLUMN "redirect_to_external" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "external_event_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "redirect_to_external" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_transactions" ADD CONSTRAINT "event_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_transactions" ADD CONSTRAINT "event_transactions_participation_id_event_participations_id_fk" FOREIGN KEY ("participation_id") REFERENCES "public"."event_participations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_transactions" ADD CONSTRAINT "event_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_transactions" ADD CONSTRAINT "event_transactions_host_member_id_members_id_fk" FOREIGN KEY ("host_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_transactions_checkout_session_unique" ON "event_transactions" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "event_transactions_event_paid_idx" ON "event_transactions" USING btree ("event_id","paid_at");--> statement-breakpoint
CREATE INDEX "event_transactions_host_paid_idx" ON "event_transactions" USING btree ("host_member_id","paid_at");