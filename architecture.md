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
| `automations` | Scheduled AI workflow definitions | `id`, `tenantId`, `name`, `prompt`, `model`, `schedule`, `scheduleLabel`, `timezone`, `status`, `icon`, `lastRunAt`, `nextRunAt` |
| `automation_runs` | Automation execution history & full AI markdown output | `id`, `automationId`, `tenantId`, `status`, `resultTitle`, `resultContent`, `modelUsed`, `durationMs`, `error`, `startedAt`, `completedAt` |

---

## ⚙️ Key Services & Modules

1. **`src/server/corsair.ts`**:
   - Initialized Corsair SDK with Gmail and Google Calendar plugins.
   - Multi-tenant tenant configuration linked to Postgres database connection.

2. **`src/server/services/api-keys.ts`**:
   - Encrypts and decrypts user API keys using server secret `ENCRYPTION_SECRET`.
   - Never exposes plaintext keys to client-side JS.

3. **`src/server/services/automation-executor.ts`**:
   - Executes background automation prompts using Vercel AI SDK `generateText`.
   - Multi-step tool execution with Corsair Gmail/Calendar tools and dedicated email tools.
   - Decrypts user API keys or invokes `enforceAiQuota`. Produces full markdown reports.

4. **`src/server/lib/cron-utils.ts`**:
   - Timezone-aware cron parsing via `cron-parser`. Computes next run execution timestamps and generates human-friendly schedule labels.

5. **`src/server/lib/models.ts`**:
   - Shared multi-provider factory (`getModelInstance`) supporting Gemini, OpenAI GPT, and Anthropic Claude.

6. **`src/server/lib/prompt-builder.ts`**:
   - Constructs rich identity, user timezone, integration status, and operation safety rules into system prompts.

7. **`src/inngest/functions.ts`**:
   - Background tasks: `syncGmailWebhook`, `handleIntegrationConnected`, `renewExpiringWebhooks`.
   - Automations: `pollDueAutomations` (5-min poller) and `executeAutomation` (durable multi-step execution).

---

## 🔌 External Integrations

- **Google OAuth & APIs**: Gmail API & Google Calendar API (via Corsair SDK wrapper).
- **Vercel AI SDK**: Multi-provider support (Google Gemini, OpenAI GPT, Anthropic Claude).
- **Inngest**: Background serverless queue & cron scheduler.
- **Neon / PostgreSQL**: Serverless Postgres persistence via Drizzle ORM.
