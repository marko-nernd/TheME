ALTER TABLE events ALTER COLUMN refund_days_before SET DEFAULT 45;
--> statement-breakpoint
ALTER TABLE event_proposals ALTER COLUMN refund_days_before SET DEFAULT 45;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN show_refund_note boolean NOT NULL DEFAULT true, ADD COLUMN flight_costs_excluded boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE event_proposals ADD COLUMN show_refund_note boolean NOT NULL DEFAULT true, ADD COLUMN flight_costs_excluded boolean NOT NULL DEFAULT true;
