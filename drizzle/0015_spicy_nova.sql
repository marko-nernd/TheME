CREATE TABLE "system_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"current_value" integer,
	"threshold" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"first_triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "system_heartbeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'healthy' NOT NULL,
	"cpu_percent" integer,
	"memory_used_mb" integer,
	"memory_limit_mb" integer,
	"memory_percent" integer,
	"storage_used_mb" integer,
	"storage_total_mb" integer,
	"storage_percent" integer,
	"database_latency_ms" integer,
	"response_time_ms" integer,
	"uptime_seconds" integer,
	"detail" text DEFAULT '' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_acknowledged_by_admin_accounts_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."admin_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_alerts_status_triggered_idx" ON "system_alerts" USING btree ("status","last_triggered_at");--> statement-breakpoint
CREATE INDEX "system_alerts_metric_status_idx" ON "system_alerts" USING btree ("metric","status");--> statement-breakpoint
CREATE INDEX "system_heartbeats_recorded_idx" ON "system_heartbeats" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "system_heartbeats_status_recorded_idx" ON "system_heartbeats" USING btree ("status","recorded_at");