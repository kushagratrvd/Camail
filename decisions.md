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

## 🗓️ Planned Future Improvements

### [2026-08-20] Planned: Tie AI Quota Enforcement to Connected Gmail Email, Not Just `user.id`

- **Problem**: Current quota (`corsairSyncQuotas.tenantId = user.id`) is bypassed by simply signing in with a new Google account. Each new auth account gets a fresh `user.id` and a fresh quota row.
- **Why It's Partially Mitigated Now**: The app's value is reading the user's actual Gmail. A throwaway new Google account has an empty inbox, so farming accounts has limited real-world value. The 50 AI queries/month free limit also keeps abuse impact low.
- **Planned Fix**: In `enforceAiQuota`, additionally key quota on the connected Gmail `accountEmail` from `corsair_accounts`. If `accountEmail` matches an existing quota record, apply it regardless of which auth `user.id` is active. This prevents the same person connecting the same Gmail inbox from multiple auth accounts to multiply their quota.
- **Also Needed**: Add FK from `corsairSyncQuotas.tenantId` → `users.id` (with `onDelete: cascade`) to prevent orphaned quota rows when users are deleted. Do this in the next schema migration (automations migration is a good opportunity).
- **Alternatives Considered**: IP-based rate limiting (easily bypassed by VPN), phone verification (too much friction for free tier), payment verification (premature).
- **Priority**: Low — implement when the platform has real paying users or the 50 query limit is frequently hit.
