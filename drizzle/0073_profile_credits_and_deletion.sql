ALTER TABLE members ADD COLUMN profile_identity_changes_used integer NOT NULL DEFAULT 0 CHECK(profile_identity_changes_used>=0), ADD COLUMN profile_credits integer NOT NULL DEFAULT 0 CHECK(profile_credits>=0);
--> statement-breakpoint
UPDATE members m SET profile_identity_changes_used=least(3,(SELECT count(*)::int FROM member_name_changes c WHERE c.member_id=m.id));
--> statement-breakpoint
ALTER TABLE member_name_changes ADD COLUMN credits_spent integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE profile_credit_purchases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE, quantity integer NOT NULL CHECK(quantity IN(1,3,10)), amount_cents integer NOT NULL CHECK(amount_cents=quantity*50), stripe_session_id text UNIQUE, checkout_url text, status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','paid')), created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz);
--> statement-breakpoint
CREATE INDEX profile_credit_purchase_member_idx ON profile_credit_purchases(member_id,created_at);
--> statement-breakpoint
CREATE TABLE account_deletion_challenges(member_id uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE, code_hash text NOT NULL, expires_at timestamptz NOT NULL, requested_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0, consumed_at timestamptz);
