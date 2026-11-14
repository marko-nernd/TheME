ALTER TABLE "event_proposals" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "primary_role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."proposal_role";--> statement-breakpoint
CREATE TYPE "public"."proposal_role" AS ENUM('organizer', 'promoter', 'model', 'photographer', 'sponsor');--> statement-breakpoint
ALTER TABLE "event_proposals" ALTER COLUMN "role" SET DATA TYPE "public"."proposal_role" USING "role"::"public"."proposal_role";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "primary_role" SET DATA TYPE "public"."proposal_role" USING "primary_role"::"public"."proposal_role";--> statement-breakpoint
ALTER TABLE "identity_documents" ALTER COLUMN "member_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_participations" ADD COLUMN "guest_access_token_hash" text;--> statement-breakpoint
ALTER TABLE "event_participations" ADD COLUMN "confirmation_email_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "event_participations_event_email_unique" ON "event_participations" USING btree ("event_id","applicant_email");