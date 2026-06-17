ALTER TABLE "corsair_chats" DROP CONSTRAINT "corsair_chats_tenant_id_unique";--> statement-breakpoint
ALTER TABLE "corsair_chats" ADD COLUMN "title" text DEFAULT 'New Chat' NOT NULL;