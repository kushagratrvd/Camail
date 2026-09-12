# 🧠 Architectural & Technical Decisions Log

> Record of significant technical choices, patterns, and trade-offs made in Camail.
> Format: `[YYYY-MM-DD] Decision: X over Y because Z`
> Note: Dates are derived from git commit history where possible.

---

## 📅 Decision History

### [2026-06-16 → 2026-08-01] Decision: Decoupled Minimal Auth Scopes over Upfront Full OAuth Scopes

- **Decision**: Authenticate users via Better Auth with minimal identity scopes (`openid`, `profile`, `email`), moving Gmail and Google Calendar OAuth consent to individual opt-in actions in `/settings`.
- **Alternatives Considered**: Requesting `gmail.modify` and `calendar` scopes immediately during user sign-in.
- **History**: First decoupled in Jun 16 commit ("refactor(auth): migrate Google OAuth flow to Corsair"). Briefly reversed in Jun 17 ("unified single-click google auth" added scopes back). Re-decoupled and stabilised as the proper connect/settings flow by Aug 1.
- **Reasoning**: Upfront full scope requests reduce initial conversion rate and raise security concerns. Decoupled integration allows users to sign up first and selectively grant permissions as needed.

---

### [~2026-08-01] Decision: AES-256-GCM Server-Side Key Storage over Plaintext LocalStorage

- **Decision**: Store user-provided Google, OpenAI, and Anthropic API keys encrypted in PostgreSQL (`user_api_keys` table using AES-256-GCM with `ENCRYPTION_SECRET`).
- **Alternatives Considered**: Keeping keys in client-side `localStorage` or passing plaintext keys in every HTTP header.
- **Note**: Exact commit date not captured in visible git log; estimated ~Aug 1 based on commit ordering.
- **Reasoning**: `localStorage` is vulnerable to XSS attacks and browser extensions. Server-side encryption ensures credentials never leak in browser storage or logs while enabling background server tasks (e.g. automations) to use them.

---

### [2026-08-02] Decision: Vercel AI SDK + Custom Dedicated Tools over Direct Raw MCP Script Execution for Email Sending

- **Decision**: Register dedicated high-level tools (`send_email`, `reply_to_message`, `create_draft`) alongside Corsair's low-level MCP `run_script` tool.
- **Alternatives Considered**: Forcing the LLM to write raw JavaScript base64 MIME construction scripts via `run_script` for sending emails.
- **Evidence in git**: Aug 2 commit "feat: self-healing OAuth token refresh, bulk email sending" shipped `z.union([z.string(), z.array(z.string())])` for multi-recipient support — proving the dedicated tool approach.
- **Reasoning**: Raw MIME construction in LLM script execution is error-prone, fragile across edge cases, and hard to validate for safety. High-level tools handle encoding cleanly and reliably.

---

### [2026-08-20] Decision: Poll-and-Dispatch Cron Architecture for Automations over Per-Automation Inngest Crons

- **Decision**: Use a single Inngest poller cron (`pollDueAutomations` running every 5 minutes) to find due automations and dispatch individual `automation.execute` events.
- **Alternatives Considered**: Registering a unique dynamic Inngest cron job per automation.
- **Reasoning**: Dynamic per-job crons can quickly exceed Inngest free-tier job limits and complicate job lifecycle management. A centralized poller scales smoothly within tier limits.

---

### [2026-08-20] Decision: Structured System Documentation Standards (`handover.md`, `decisions.md`, `flow.md`, `architecture.md`, `constraints.md`, `test-checklist.md`, `rollback.md`, `plans.md`)

- **Decision**: Maintain standardized markdown files at project root to track state, architecture, constraints, test verification, and implementation history.
- **Alternatives Considered**: Ad-hoc chat notes or relying on LLM context windows.
- **Reasoning**: Explicit persistent root documentation ensures seamless context recovery across agent sessions and model version updates.

---

### [2026-09-12] Decision: Per-Automation Model Selection with Server-Side Decrypted Keys over App-Wide Model Locking
*Model: Gemini 3.8 Flash*

- **Decision**: Allow users to choose their preferred AI model (Gemini 2.5 Flash, GPT-5.4, GPT-5.2, Claude Opus 4.7, Claude Sonnet 4.6) per automation, dynamically checking if the required provider key is saved in `user_api_keys`.
- **Alternatives Considered**: Forcing all background automations to run strictly on default Gemini Flash, or requiring a global default model setting.
- **Reasoning**: Users need different models for different tasks (e.g. lightweight fast summaries with Gemini Flash vs complex reasoning with Claude Opus). By persisting `model` on the `automations` table and resolving keys via `getDecryptedKeys(tenantId)`, automations execute autonomously with the exact provider the user intended.

---

### [2026-09-12] Decision: Unified AI Quota & Tiered 3-Automation Free Cap over Separate Quota Pools
*Model: Gemini 3.8 Flash*

- **Decision**: Unify automation execution quota with chat AI quota (`enforceAiQuota`). Free users without custom API keys are capped at **3 active automations**; users with custom API keys or Pro status have **unlimited automations**.
- **Alternatives Considered**: Creating a dedicated second quota table/counter for automations or completely banning free users from automations.
- **Reasoning**: Prevents user confusion by sharing a single simple monthly budget. The 3-automation cap on free tier avoids abuse while giving users full access to test out the scheduling features. Adding their own API keys removes all limits without server cost risk.

---

### [2026-09-12] Decision: Full Markdown Response Persistence in `automation_runs` over Brief Summaries
*Model: Gemini 3.8 Flash*

- **Decision**: Persist the complete, rich AI response in `automation_runs.result_content` (`text`) and render it via `MarkdownRenderer` in a dedicated run inspection drawer/modal.
- **Alternatives Considered**: Storing only a 2-line summary or discarding the output after alerting the user.
- **Reasoning**: Automations frequently extract complex multi-item insights (e.g., categorizing 20 emails with action items, bulleted meeting agendas). Users must be able to audit, inspect, and copy the full historical trace from the Runs tab.

### [2026-09-12] Decision: Typed Drizzle Comparison Operators (`gte`, `lte`) over Raw `sql` Template String Date Interpolation
*Model: Gemini 3.8 Flash*

- **Decision**: Always use Drizzle's typed column operators (e.g. `gte(table.createdAt, dateObj)`) rather than raw `sql`${table.createdAt} >= ${dateObj}`` when querying timestamp columns.
- **Alternatives Considered**: Raw SQL string concatenation or passing Date instances into `sql`\`...\`.
- **Reasoning**: In postgres-js, interpolating a raw `Date` object into Drizzle's `sql` template bypasses column-level driver serializers. The underlying driver attempts to call `Buffer.from(param)`, triggering `TypeError: The "string" argument must be of type string or an instance of Buffer or ArrayBuffer. Received an instance of Date`. Typed operators (`gte`, `lte`) properly invoke Drizzle's timestamp encoder.

### [2026-09-13] Decision: Omit Raw Event Payload from Activity Log Responses & UI
*Model: Gemini 3.8 Flash*

- **Decision**: Restrict `activityRouter.getRecentEvents` to selecting only metadata (`id`, `eventType`, `status`, `createdAt`, `updatedAt`), omitting the `corsair_events.payload` JSONB column. Remove raw payload rendering in `/activity`.
- **Alternatives Considered**: Masking/sanitizing known sensitive keys in the JSON payload before client serialization.
- **Reasoning**: Raw event payloads from Gmail/Calendar webhooks contain email snippets, message IDs, and attendee headers. Completely omitting the payload column server-side prevents accidental PII exposure during screen-shares and minimizes bandwidth, while still providing full audit visibility of execution events and status.

### [2026-09-13] Decision: Remove Internal API Reference & `openapi.json` from Documentation
*Model: Gemini 3.8 Flash*

- **Decision**: Remove the "API Reference" interactive section and the downloadable `openapi.json` file from `/docs`. Restrict `/docs` to user onboarding, AI capabilities, privacy compliance, and FAQs.
- **Alternatives Considered**: Keeping the API Reference but updating it to document server-side API keys.
- **Reasoning**: Camail is a SaaS workspace application, not an open public developer platform. Exposing internal endpoints (`/api/chat`, `/api/connect`, `/api/webhooks`) and their parameter signatures publishes unnecessary attack surface, invites bot traffic to webhook endpoints, and documented an obsolete schema (passing plaintext keys in chat). Removing it streamlines user documentation and eliminates route information disclosure.

---

## 🗓️ Planned Future Improvements

### [2026-08-20] Planned: Tie AI Quota Enforcement to Connected Gmail Email, Not Just `user.id`

- **Problem**: Current quota (`corsairSyncQuotas.tenantId = user.id`) is bypassed by simply signing in with a new Google account. Each new auth account gets a fresh `user.id` and a fresh quota row.
- **Why It's Partially Mitigated Now**: The app's value is reading the user's actual Gmail. A throwaway new Google account has an empty inbox, so farming accounts has limited real-world value. The 50 AI queries/month free limit also keeps abuse impact low.
- **Planned Fix**: In `enforceAiQuota`, additionally key quota on the connected Gmail `accountEmail` from `corsair_accounts`. If `accountEmail` matches an existing quota record, apply it regardless of which auth `user.id` is active. This prevents the same person connecting the same Gmail inbox from multiple auth accounts to multiply their quota.
- **Also Needed**: Add FK from `corsairSyncQuotas.tenantId` → `users.id` (with `onDelete: cascade`) to prevent orphaned quota rows when users are deleted. Do this in the next schema migration (automations migration is a good opportunity).
- **Alternatives Considered**: IP-based rate limiting (easily bypassed by VPN), phone verification (too much friction for free tier), payment verification (premature).
- **Priority**: Low — implement when the platform has real paying users or the 30 query limit is frequently hit.

---

### [2026-09-13] Decision: 30 Free AI Queries/Month over 50 Queries/Month
- **AI Model**: Antigravity (Advanced Agentic Coding)
- **Decision**: Reduced the Starter free tier AI quota from 50 to 30 queries/month across backend enforcement (`src/server/lib/quota.ts`), pricing page, and marketing landing page.
- **Alternatives Considered**: Keeping 50 queries/month or dropping to 20 queries/month.
- **Reason**: 30 queries per month provides 1 query per day for casual free users, balancing API token operational overhead on the default platform keys while providing sufficient utility before prompting upgrade to Pro (₹399/mo) or bringing custom API keys (BYOK).
