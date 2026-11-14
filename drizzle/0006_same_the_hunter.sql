CREATE TABLE "admin_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "x_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "youtube_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onlyfans_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "custom_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_premium_blur" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_accounts_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_accounts_username_unique" ON "admin_accounts" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_session_token_unique" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_session_admin_idx" ON "admin_sessions" USING btree ("admin_id");