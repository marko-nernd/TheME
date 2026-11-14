ALTER TABLE "event_transactions" ADD COLUMN "confirmation_code" varchar(6);--> statement-breakpoint
UPDATE "event_transactions"
SET "confirmation_code" = upper(substring(md5("id"::text) from 1 for 6))
WHERE "confirmation_code" IS NULL;--> statement-breakpoint
ALTER TABLE "event_transactions" ALTER COLUMN "confirmation_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "event_transactions_event_confirmation_unique" ON "event_transactions" USING btree ("event_id","confirmation_code");
