CREATE TABLE member_activity_buckets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 bucket_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX member_activity_member_bucket_unique ON member_activity_buckets(member_id,bucket_at);
--> statement-breakpoint
CREATE INDEX member_activity_bucket_idx ON member_activity_buckets(bucket_at);
--> statement-breakpoint
CREATE TABLE member_activity_tracking (id integer PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
INSERT INTO member_activity_tracking(id) VALUES(1);
