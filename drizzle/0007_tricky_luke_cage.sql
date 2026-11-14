CREATE TABLE "event_type_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"refund_days_before" integer DEFAULT 61 NOT NULL,
	"no_refund_days_before" integer DEFAULT 45 NOT NULL,
	"additional_terms" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "event_type_policies_type_unique" ON "event_type_policies" USING btree ("event_type");