# ⛔ System Constraints & Non-Negotiable Rules

> Hard boundaries and constraints that MUST NEVER be violated by any human developer or AI agent.

---

## 🚫 Restricted Files & Directives

1. **Do NOT Modify Auth Core Scope Setup (`src/server/auth.ts`) Without Consent**:
   - Keep Better Auth sign-in scopes restricted to minimal identity (`openid`, `profile`, `email`).
   - Do NOT add `gmail.modify` or `calendar` back to initial sign-in scopes. Third-party integrations belong in `/settings`.

2. **Do NOT Bypass AI Quota Controls (`src/server/lib/quota.ts`)**:
   - Every AI invocation path (chat API, background automations) MUST invoke `enforceAiQuota` unless custom user-supplied API keys are active.

3. **Permanently Restricted AI Operations**:
   - The following operations are strictly blocked by safety policy and must never be permitted in `run_script` or custom tools:
     - `messages.delete` — permanently blocked
     - `messages.trash` — permanently blocked
     - `threads.delete` — permanently blocked
     - `threads.trash` — permanently blocked
     - `events.delete` — permanently blocked
     - `messages.send` — blocked in `run_script`; use the `send_email` dedicated tool instead
     - `drafts.create` — blocked in `run_script`; use the `create_draft` dedicated tool instead
     - `drafts.send` — blocked in `run_script`; use dedicated tools instead
   - All of the above are enforced at runtime in `src/server/lib/quota.ts` → `validateRestrictedOperations`.


4. **API Credentials & Security Rules**:
   - **NEVER** expose plaintext API keys in client-side state or `localStorage`.
   - All API keys must be encrypted using `src/server/services/api-keys.ts` with AES-256-GCM.
   - Do NOT log raw authorization tokens or decrypted keys to `console.log`.

5. **Tool & Script Execution Rules**:
   - Do NOT attempt to construct raw base64 MIME emails in `run_script`. Use the dedicated `send_email`, `reply_to_message`, and `create_draft` tools.
   - Always validate user inputs for safety using `validatePromptSafety`.

6. **Inngest Scalability Rules**:
   - Avoid creating dynamic per-user Inngest cron definitions.
   - Use the poll-and-dispatch model (`pollDueAutomations` cron triggering `automation.execute` events) to remain within Inngest free-tier job limits.

7. **Database & Schema Updates**:
   - Always use `drizzle-kit generate` and `drizzle-kit push` for DB updates. Never run manual un-tracked `ALTER TABLE` queries outside migration management.
