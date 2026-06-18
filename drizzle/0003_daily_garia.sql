CREATE TABLE "corsair_sync_quotas" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_reset" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "accounts_tenant_idx" ON "corsair_accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "chats_tenant_idx" ON "corsair_chats" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "chats_updated_at_idx" ON "corsair_chats" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "entities_account_idx" ON "corsair_entities" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "events_account_idx" ON "corsair_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "events_created_at_idx" ON "corsair_events" USING btree ("created_at");