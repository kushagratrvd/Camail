# 🎯 Feature Trace: Automations / Scheduler

> Detailed trace file tracking the implementation of the Automations / Scheduler feature from discovery to verification.

---

## 📋 Feature Scope & Goal

Build an Automations/Scheduler feature in Camail allowing users to configure recurring scheduled AI tasks (e.g. daily job application email checks, morning briefs, summary generation, email alerts). Automations run automatically on schedule via Inngest and display execution history under a dedicated "Runs" visualizer tab in `/automations`.

---

## 🎨 UI & Requirement References

- **Sidebar Entry**: "Automations" with `Zap` icon in `src/app/app-layout.tsx`.
- **Views**:
  - `Automations` Tab: Run history bar chart (last 30 days), Active Automations list with schedule & status, Pre-built Template cards grid.
  - `Runs` Tab: 30-day run history chart with Succeeded/Failed totals, list of executed runs showing output summaries, status icons, and execution timestamps.
  - `Run Detail` Modal/View: Shows full AI markdown response and execution duration ("Worked for Xs").

---

## 🛠️ Approaches & Technical Design

### Approach 1: Dynamic Per-Automation Inngest Cron
- *Status*: Rejected
- *Reason*: Inngest free tier limits dynamic cron registrations. Having 5-10 users each creating 3 crons would quickly breach limits.

### Approach 2: Poll-and-Dispatch Architecture (Chosen)
- *Status*: Approved
- *Reason*: Single Inngest poller cron (`pollDueAutomations` running every 5 minutes) checks for automations due to run (`nextRunAt <= NOW()`) and dispatches event `automation.execute`. Scales within free-tier limits.

---

## 📅 Step-by-Step Task Checklist

- [x] Add `automations` and `automationRuns` tables to `src/server/db/schema.ts`
- [x] Run `npx drizzle-kit generate` & `npx drizzle-kit push` (Migration: `0006_narrow_sebastian_shaw.sql`)
- [x] Create `src/server/lib/cron-utils.ts` for cron parsing (`cron-parser`)
- [x] Create `src/server/services/automation-executor.ts` (shared AI prompt execution service)
- [x] Create `src/server/api/routers/automations.ts` (tRPC router for CRUD & runs history)
- [x] Register `automationsRouter` in `src/server/api/root.ts`
- [x] Implement `executeAutomation` and `pollDueAutomations` in `src/inngest/functions.ts`
- [x] Register new Inngest functions in `src/app/api/inngest/route.ts`
- [x] Create `/automations` UI page and subcomponents (`RunHistoryChart`, `CreateAutomationModal`, `RunDetailModal`, `templates-data.ts`)
- [x] Update `src/app/app-layout.tsx` to add "Automations" with `Zap` icon to sidebar
- [x] Verify feature using `test-checklist.md` (typecheck passed, build succeeded)

---

## 🔍 Verification & Sign-off

- **TypeScript Compilation**: `pnpm typecheck` passed with 0 errors.
- **Drizzle Schema Migration**: Generated `0006_narrow_sebastian_shaw.sql` and pushed successfully to Neon Postgres via `pnpm db:push`.
- **Production Build**: `pnpm build` completed successfully.
- **Decisions Logged**: Recorded in `decisions.md`.
- **Architecture & Flow Maps**: Updated in `architecture.md` and `flow.md`.

