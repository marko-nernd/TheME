CREATE TABLE "account_recovery_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "purpose" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "account_recovery_token_unique" ON "account_recovery_tokens" ("token_hash");
CREATE INDEX "account_recovery_member_created_idx" ON "account_recovery_tokens" ("member_id", "created_at");
ALTER TABLE "member_notifications" ADD COLUMN "resource_id" uuid;
CREATE INDEX "member_notifications_resource_idx" ON "member_notifications" ("resource_id");
