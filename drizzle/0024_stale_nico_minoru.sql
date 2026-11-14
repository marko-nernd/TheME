ALTER TABLE "event_transactions" ALTER COLUMN "stripe_checkout_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_participations" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "event_transactions_payment_intent_unique" ON "event_transactions" USING btree ("stripe_payment_intent_id");