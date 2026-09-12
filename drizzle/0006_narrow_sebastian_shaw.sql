CREATE TABLE "automation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"automation_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"result_title" text,
	"result_content" text,
	"model_used" text,
	"duration_ms" integer,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"model" text DEFAULT 'google/gemini-2.5-flash' NOT NULL,
	"schedule" text NOT NULL,
	"schedule_label" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"icon" text DEFAULT 'Zap' NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runs_automation_idx" ON "automation_runs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "runs_tenant_idx" ON "automation_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "runs_created_at_idx" ON "automation_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automations_tenant_idx" ON "automations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "automations_status_next_run_idx" ON "automations" USING btree ("status","next_run_at");