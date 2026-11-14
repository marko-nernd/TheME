DROP FUNCTION IF EXISTS purge_member_account(uuid);--> statement-breakpoint
CREATE FUNCTION purge_member_account(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM members m WHERE m.id = p_member_id AND m.deleted_at IS NULL) THEN
    RETURN;
  END IF;

  DELETE FROM member_reviews r WHERE r.reviewer_member_id = p_member_id OR r.reviewed_member_id = p_member_id;
  DELETE FROM event_transactions t WHERE t.member_id = p_member_id OR t.host_member_id = p_member_id;
  DELETE FROM event_participations p WHERE p.member_id = p_member_id;
  DELETE FROM sponsorship_agreements a WHERE a.organizer_member_id = p_member_id OR a.sponsor_member_id = p_member_id OR a.beneficiary_member_id = p_member_id;
  DELETE FROM sponsorship_requests r WHERE r.requester_member_id = p_member_id OR r.target_member_id = p_member_id;
  DELETE FROM sponsor_tier_change_requests r WHERE r.member_id = p_member_id;
  DELETE FROM profile_contact_audits a WHERE a.viewer_member_id = p_member_id OR a.target_member_id = p_member_id;
  DELETE FROM event_proposals p WHERE p.member_id = p_member_id;
  DELETE FROM events e WHERE e.owner_id = p_member_id;
  DELETE FROM identity_documents d WHERE d.member_id = p_member_id;
  DELETE FROM identity_audit_logs a WHERE a.member_id = p_member_id;
  DELETE FROM member_name_changes n WHERE n.member_id = p_member_id;
  DELETE FROM email_verification_tokens t WHERE t.member_id = p_member_id;
  DELETE FROM member_sessions s WHERE s.member_id = p_member_id;
  DELETE FROM billing_customers c WHERE c.member_id = p_member_id;
  DELETE FROM profiles p WHERE p.member_id = p_member_id;

  DELETE FROM sponsors s
   WHERE s.id IN (SELECT sm.sponsor_id FROM sponsor_members sm WHERE sm.member_id = p_member_id)
     AND NOT EXISTS (
       SELECT 1 FROM sponsor_members other
        WHERE other.sponsor_id = s.id AND other.member_id <> p_member_id
     );
  DELETE FROM sponsor_members sm WHERE sm.member_id = p_member_id;

  UPDATE collaboration_requests r
     SET sender_hidden_at = NULL
   WHERE r.sender_member_id = p_member_id OR r.recipient_member_id = p_member_id;

  UPDATE members m
     SET email = 'deleted+' || replace(p_member_id::text, '-', '') || '@deleted.invalid',
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
         camera_brand = NULL,
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
   WHERE m.id = p_member_id;
END;
$$;

UPDATE profiles p
   SET image_path = CASE lower(m.camera_brand)
     WHEN 'canon' THEN '/images/photographers/canon.png'
     WHEN 'nikon' THEN '/images/photographers/nikon.png'
     WHEN 'pentax' THEN '/images/photographers/nikon.png'
     WHEN 'fujifilm' THEN '/images/photographers/fujifilm.png'
     WHEN 'leica' THEN '/images/photographers/fujifilm.png'
     WHEN 'hasselblad' THEN '/images/photographers/hasselblad.png'
     ELSE '/images/photographers/sony.png'
   END,
       updated_at = now()
  FROM members m
 WHERE p.member_id = m.id
   AND p.role = 'photographer'
   AND m.camera_brand IS NOT NULL
   AND p.image_path = '/images/desert-production.png';
