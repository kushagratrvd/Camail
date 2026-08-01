CREATE TABLE "user_api_keys" (
	"user_id" text PRIMARY KEY NOT NULL,
	"google_key_enc" text,
	"openai_key_enc" text,
	"anthropic_key_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corsair_sync_quotas" ADD COLUMN "ai_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "corsair_sync_quotas" ADD COLUMN "ai_last_reset" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;