CREATE TABLE "corsair_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plugin" text NOT NULL,
	"history_id" text,
	"watch_expiration" timestamp with time zone,
	"channel_id" text,
	"resource_id" text,
	"channel_expiration" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corsair_accounts" ADD COLUMN "status" text DEFAULT 'DISCONNECTED' NOT NULL;--> statement-breakpoint
ALTER TABLE "corsair_accounts" ADD COLUMN "status_error" text;--> statement-breakpoint
ALTER TABLE "corsair_accounts" ADD COLUMN "account_email" text;--> statement-breakpoint
CREATE INDEX "webhooks_tenant_plugin_idx" ON "corsair_webhooks" USING btree ("tenant_id","plugin");