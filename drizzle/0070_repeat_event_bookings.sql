DROP INDEX event_participations_event_member_unique;
--> statement-breakpoint
DROP INDEX event_participations_event_email_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX event_participations_event_member_unique ON event_participations (event_id, member_id) WHERE status NOT IN ('declined', 'cancelled', 'refunded');
--> statement-breakpoint
CREATE UNIQUE INDEX event_participations_event_email_unique ON event_participations (event_id, applicant_email) WHERE status NOT IN ('declined', 'cancelled', 'refunded');
