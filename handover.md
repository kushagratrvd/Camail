# 🤝 Session Handover & Continuity

> **Living document** for session continuity. Read this at the start of every AI session.
> Summarizes current system state, active work, unstable areas, and key focus items.

---

## 📌 Current Status Snapshot (As of 2026-09-12)

- **Overall Health**: Stable & verified. Core chat, Gmail/Calendar sync, API key encryption, BYOK quota system, and the complete **Automations / Scheduler Feature** are fully implemented, verified via `pnpm typecheck`, `pnpm db:push`, and `pnpm build`.
- **Active Scope**: Automations / Scheduler Feature is complete and integrated into UI. Ready for user testing and deployment.
- **Recent Completion**: End-to-end Automations feature (Drizzle schema, Inngest cron & dispatch executor, tRPC automations router, shared AI model factory, and `/automations` management UI).

---

## 🚀 Fully Done

1. **Authentication & Progressive OAuth**:
   - Better Auth Google integration with minimal identity scopes (`openid`, `profile`, `email`).
   - Decoupled OAuth connect/disconnect for Gmail & Google Calendar in Settings.
   - Dynamic `accountEmail` extraction from OAuth `id_token`.
2. **Encrypted API Key Storage**:
   - AES-256-GCM server-side encryption via `ENCRYPTION_SECRET`.
   - `user_api_keys` Drizzle table; client UI displays masked hints (`sk-p••••a3Bf`).
3. **AI Chat Engine & Corsair MCP Tools**:
   - `/api/chat` route with Vercel AI SDK (`streamText`) + Corsair MCP tool definitions.
   - Shared model instantiation (`src/server/lib/models.ts`) across chat and automations.
   - Custom tools: `send_email`, `reply_to_message`, `create_draft` (handles MIME/base64 automatically).
   - System prompt builder with timezone formatting, guardrails, and quota enforcement.
4. **Background Sync & Webhooks**:
   - Inngest integration for Gmail Pub/Sub webhooks & Calendar channel sync.
   - Automatic webhook renewal cron running daily (`renewExpiringWebhooks`).
5. **Automations & AI Scheduler Feature**:
   - `automations` and `automation_runs` tables with indices and foreign keys in Neon Postgres.
   - Poll-and-dispatch background engine (`pollDueAutomations` cron + `executeAutomation` worker) avoiding Inngest cron limits.
   - Autonomous executor (`src/server/services/automation-executor.ts`) with Corsair tools and BYOK key decryption.
   - Protected tRPC router (`src/server/api/routers/automations.ts`) with 3-automation free tier guard.
   - Modern, responsive `/automations` UI with templates gallery, 30-day activity chart, and full markdown run viewer.

---

## 🚧 In Progress

- Feature complete; awaiting user testing and deployment review.

---

## ⚠️ Unstable / Sensitive Areas to Watch Out For

- **Google OAuth Quotas**: Shared Google Console project quota. Avoid unthrottled API polling loops.
- **Inngest Cloud & Fallback**: In production, Inngest Cloud calls `/api/inngest` and receives events via `INNGEST_EVENT_KEY`. In local development without an event key, `runNow` transparently falls back to direct background execution.
- **RunScript Safety Rules**: `validateRestrictedOperations` in `quota.ts` blocks restricted raw operations at script execution time. Dedicated tools (`send_email`, `create_draft`, `reply_to_message`) must be used for email creation.

---

## 📝 5-Line Session Summary

- **Done**: Fully implemented Automations/Scheduler end-to-end, made `/automations` scrollable, hardened `/activity` (removed raw payload), and secured `/docs` (removed internal API specs & openapi.json).
- **In Progress**: Validated automation creation and manual execution flows.
- **Next Up**: Observe manual and scheduled runs in Runs History tab, then commit changes to Git.
- **Watch Out**: Inngest functions (`executeAutomation`, `pollDueAutomations`) are automatically served by Inngest Cloud via `/api/inngest`.
- **Status**: Production build & runtime verified. Ready for testing.
