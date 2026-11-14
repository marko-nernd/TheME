ALTER TABLE event_participations ADD COLUMN check_in_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE event_participations ADD COLUMN checked_in_at timestamptz;
ALTER TABLE event_participations ADD COLUMN checked_in_by uuid REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE event_participations ADD COLUMN checkout_attempt uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE host_payout_accounts (
  member_id uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE event_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES event_transactions(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  decision_note text NOT NULL DEFAULT '',
  stripe_refund_id text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
