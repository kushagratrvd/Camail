# 🏗️ High-Level Architecture Map

> High-level map of major modules, data persistence, services, and external integrations in Camail.

---

## 🧩 Core Architecture Overview

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              NEXT.JS APP                               │
 │                                                                        │
 │  ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────┐  │
 │  │ App Router Pages │   │ tRPC Router Layer │   │ Next API Routes  │  │
 │  │ (/chat, /inbox,  │   │ (chat, gmail,     │   │ (/api/chat,      │  │
 │  │  /automations)   │   │  integrations)    │   │  /api/connect)   │  │
 │  └────────┬─────────┘   └─────────┬─────────┘   └────────┬─────────┘  │
 └───────────┼───────────────────────┼──────────────────────┼─────────────┘
             │                       │                      │
             ▼                       ▼                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                             SERVICE LAYER                              │
 │                                                                        │
 │  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────────┐  │
 │  │ Corsair MCP     │   │ API Key Service  │   │ Automation Executor │  │
 │  │ Integration     │   │ (AES-256-GCM)    │   │ Service (Planned)   │  │
 │  └────────┬────────┘   └────────┬─────────┘   └──────────┬──────────┘  │
 └───────────┼─────────────────────┼────────────────────────┼─────────────┘
             │                     │                        │
             ▼                     ▼                        ▼
 ┌────────────────────────┐  ┌────────────────────┐  ┌──────────────────┐
 │ PostgreSQL (Drizzle)   │  │ Inngest Job Queue  │  │ External APIs    │
 │ (corsair_*, user_keys) │  │ Webhook Sync Crons │  │ Google, AI Providers│
 └────────────────────────┘  └────────────────────┘  └──────────────────┘
```

---

## 🗄️ Database Tables (`src/server/db/schema.ts`)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `corsair_integrations` | Integration metadata | `id`, `name`, `config` |
| `corsair_accounts` | Tenant OAuth connections | `id`, `tenantId`, `integrationId`, `status`, `accountEmail` |
| `corsair_webhooks` | Webhook watch subscriptions | `id`, `tenantId`, `plugin`, `watchExpiration`, `channelId` |
| `corsair_entities` | Email/calendar entity cache (Corsair SDK-managed, not written to directly by app code) | `id`, `accountId`, `entityId`, `entityType`, `data` |
| `corsair_chats` | Conversation history | `id`, `tenantId`, `title`, `messages` |
| `corsair_sync_quotas` | Two quota systems: sync quota (daily, limit 10) via `count`/`lastReset`; AI chat quota (monthly, limit 50) via `aiCount`/`aiLastReset` | `tenantId`, `count`, `lastReset`, `aiCount`, `aiLastReset` |
| `user_api_keys` | Encrypted user LLM keys | `userId`, `googleKeyEnc`, `openaiKeyEnc`, `anthropicKeyEnc` |
| `automations` *(Planned)* | Scheduled AI workflow definitions | `id`, `tenantId`, `name`, `prompt`, `schedule`, `status` |
| `automation_runs` *(Planned)* | Automation execution logs | `id`, `automationId`, `tenantId`, `status`, `resultContent` |

---

## ⚙️ Key Services & Modules

1. **`src/server/corsair.ts`**:
   - Initialized Corsair SDK with Gmail and Google Calendar plugins.
   - Multi-tenant tenant configuration linked to Postgres database connection.

2. **`src/server/services/api-keys.ts`**:
   - Encrypts and decrypts user API keys using server secret `ENCRYPTION_SECRET`.
   - Never exposes plaintext keys to client-side JS.

3. **`src/server/lib/prompt-builder.ts`**:
   - Constructs rich identity, user timezone, integration status, and operation safety rules into system prompts.

4. **`src/inngest/functions.ts`**:
   - Handles background webhooks, initial 50-item backfills, webhook renewals, and upcoming automation execution crons.

---

## 🔌 External Integrations

- **Google OAuth & APIs**: Gmail API & Google Calendar API (via Corsair SDK wrapper).
- **Vercel AI SDK**: Multi-provider support (Google Gemini, OpenAI GPT, Anthropic Claude).
- **Inngest**: Background serverless queue & cron scheduler.
- **Neon / PostgreSQL**: Serverless Postgres persistence via Drizzle ORM.
