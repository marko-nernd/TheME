ALTER TABLE events ADD COLUMN accommodation_details jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE event_proposals ADD COLUMN accommodation_details jsonb NOT NULL DEFAULT '[]'::jsonb;
