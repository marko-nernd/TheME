ALTER TABLE events ADD COLUMN IF NOT EXISTS travel_details jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS travel_details jsonb NOT NULL DEFAULT '{}';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS attendee_flights (
 participation_id uuid PRIMARY KEY REFERENCES event_participations(id) ON DELETE CASCADE,
 airline text NOT NULL DEFAULT '', flight_number text NOT NULL, arrival_local text NOT NULL,
 departure_local text NOT NULL DEFAULT '', timezone text NOT NULL, notes text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS travel_email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 member_id uuid REFERENCES members(id) ON DELETE CASCADE, email text NOT NULL, title text NOT NULL, slug text NOT NULL,
 attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS travel_email_pending_idx ON travel_email_outbox(sent_at, next_attempt_at);
