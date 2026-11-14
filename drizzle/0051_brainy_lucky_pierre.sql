ALTER TABLE "event_participations" ALTER COLUMN "member_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_documents" ALTER COLUMN "member_id" SET NOT NULL;