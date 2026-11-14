ALTER TABLE "members" ADD COLUMN "membership_tier_override" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "subscription_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE OR REPLACE FUNCTION purge_member_account(target_member_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM members WHERE id = target_member_id AND deleted_at IS NULL) THEN
    RETURN;
  END IF;

  DELETE FROM member_reviews
   WHERE reviewer_member_id = target_member_id
      OR reviewed_member_id = target_member_id;
  DELETE FROM event_transactions
   WHERE member_id = target_member_id
      OR host_member_id = target_member_id;
  DELETE FROM event_participations WHERE member_id = target_member_id;
  DELETE FROM sponsorship_requests WHERE requester_member_id = target_member_id;
  DELETE FROM event_proposals WHERE member_id = target_member_id;
  DELETE FROM events WHERE owner_id = target_member_id;
  DELETE FROM identity_documents WHERE member_id = target_member_id;
  DELETE FROM identity_audit_logs WHERE member_id = target_member_id;
  DELETE FROM member_name_changes WHERE member_id = target_member_id;
  DELETE FROM email_verification_tokens WHERE member_id = target_member_id;
  DELETE FROM member_sessions WHERE member_id = target_member_id;
  DELETE FROM billing_customers WHERE member_id = target_member_id;
  DELETE FROM profiles WHERE member_id = target_member_id;

  DELETE FROM sponsors
   WHERE id IN (
     SELECT sponsor_id FROM sponsor_members WHERE member_id = target_member_id
   )
     AND NOT EXISTS (
       SELECT 1
         FROM sponsor_members other
        WHERE other.sponsor_id = sponsors.id
          AND other.member_id <> target_member_id
     );
  DELETE FROM sponsor_members WHERE member_id = target_member_id;

  UPDATE collaboration_requests
     SET sender_hidden_at = NULL
   WHERE sender_member_id = target_member_id
      OR recipient_member_id = target_member_id;

  UPDATE members
     SET email = 'deleted+' || replace(target_member_id::text, '-', '') || '@deleted.invalid',
         username = NULL,
         password_hash = 'deleted',
         home_market = 'Deleted',
         country_code = NULL,
         state_code = NULL,
         city = NULL,
         organization = NULL,
         bio = '',
         phone = NULL,
         website_url = NULL,
         portfolio_url = NULL,
         avatar_data = NULL,
         avatar_mime = NULL,
         avatar_updated_at = NULL,
         identity_verification_status = 'not_submitted',
         identity_verified_at = NULL,
         identity_review_notes = NULL,
         email_verified_at = NULL,
         admin_approved_at = NULL,
         membership_tier_override = NULL,
         subscription_exempt = false,
         inactivity_reminder_sent_at = NULL,
         final_warning_sent_at = NULL,
         account_deletion_scheduled_at = NULL,
         deleted_at = now(),
         updated_at = now()
   WHERE id = target_member_id;
END;
$$;
