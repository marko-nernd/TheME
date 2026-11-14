ALTER TABLE "event_proposals" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "primary_role" SET DATA TYPE text;--> statement-breakpoint
UPDATE "event_proposals" SET "role" = 'host' WHERE "role" IN ('organizer', 'promoter');--> statement-breakpoint
UPDATE "members" SET "primary_role" = 'host' WHERE "primary_role" IN ('organizer', 'promoter');--> statement-breakpoint
DROP TYPE "public"."proposal_role";--> statement-breakpoint
CREATE TYPE "public"."proposal_role" AS ENUM('host', 'model', 'photographer', 'sponsor');--> statement-breakpoint
ALTER TABLE "event_proposals" ALTER COLUMN "role" SET DATA TYPE "public"."proposal_role" USING "role"::"public"."proposal_role";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "primary_role" SET DATA TYPE "public"."proposal_role" USING "primary_role"::"public"."proposal_role";
