ALTER TABLE "members" ADD COLUMN "admin_approved_at" timestamp with time zone;
UPDATE "members"
SET "admin_approved_at" = COALESCE("email_verified_at", now())
WHERE "admin_approved_at" IS NULL;
