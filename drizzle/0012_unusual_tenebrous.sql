CREATE TABLE "identity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"legal_name" text NOT NULL,
	"issuing_country" text NOT NULL,
	"expires_on" text NOT NULL,
	"front_data" "bytea" NOT NULL,
	"front_mime" text NOT NULL,
	"back_data" "bytea",
	"back_mime" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "identity_verification_status" text DEFAULT 'not_submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "identity_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "identity_review_notes" text;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_documents_member_unique" ON "identity_documents" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "identity_documents_type_idx" ON "identity_documents" USING btree ("document_type");--> statement-breakpoint
UPDATE "profiles"
SET "is_verified" = false, "updated_at" = now()
FROM "members"
WHERE "profiles"."member_id" = "members"."id"
  AND "members"."identity_verification_status" <> 'approved';
