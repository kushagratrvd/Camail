# 📋 Development Log

> Chronological record of every change made to Camail during development.  
> Unlike `CHANGELOG.md` (release-facing), this tracks the **why** and **how** behind each change as the project evolved.

---

## 1 · Decoupled OAuth — Minimal Sign-In Scopes
**Date:** 2026-08-01

**Problem:** Gmail and Calendar API scopes were requested at sign-in time. Users were forced to grant full email/calendar access just to create an account.

**What changed:**
| File | Change |
|------|--------|
| `src/server/auth.ts` | Reduced Better Auth Google scopes to `openid`, `profile`, `email` only |

**Result:** Sign-in is now lightweight. Gmail/Calendar permissions are requested separately via Settings.

---

## 2 · Database Schema — Integration Status Tracking
**Date:** 2026-08-01

**Problem:** No way to track whether a user's Gmail or Calendar integration was connected, syncing, or broken.

**What changed:**
| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Added `status` enum (`CONNECTED` · `SYNCING` · `RECONNECT_REQUIRED` · `DISCONNECTED` · `ERROR`), `statusError`, and `accountEmail` columns to `corsair_accounts` |
| `src/server/db/schema.ts` | Created `corsair_webhooks` table with `channel_id`, `resource_id`, `history_id`, expiration timestamps |

**Result:** Every integration now has a trackable lifecycle state stored in Postgres.

---

## 3 · Integrations tRPC Router — Status & Disconnect
**Date:** 2026-08-01

**Problem:** No API to query integration status or disconnect cleanly.

**What changed:**
| File | Change |
|------|--------|
| `src/server/api/routers/integrations.ts` | **[NEW]** — `getStatus` query returns Gmail/Calendar status + email. `disconnect` mutation runs idempotent 3-step cleanup: Google API unsubscribe → delete accounts/webhooks → wipe entities |
| `src/server/api/root.ts` | Registered `integrationsRouter` |

---

## 4 · OAuth Connect Flow — Conditional Consent Prompt
**Date:** 2026-08-01

**Problem:** Every OAuth redirect showed the Google consent screen, even for already-connected integrations.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/connect/route.ts` | Added `needsConsentPrompt()` — only forces `prompt: 'consent'` on first connect or `RECONNECT_REQUIRED`. Returning users skip the consent screen |

---

## 5 · Post-OAuth Background Sync (Inngest + Node.js Fallback)
**Date:** 2026-08-01

**Problem:** After OAuth callback, emails/events needed to be backfilled. Inngest wasn't running in local dev, so sync never completed.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/auth/route.ts` | Extracts `accountEmail` from Google UserInfo API, sets status to `SYNCING`, invokes `processIntegrationConnected` directly in Node.js background |
| `src/inngest/functions.ts` | Added `processIntegrationConnected` (direct backfill), `handleIntegrationConnected` (Inngest event handler), `renewExpiringWebhooks` (24h cron) |
| `src/app/api/inngest/route.ts` | Registered all 3 Inngest functions in `serve()` |

**Design decision:** Dual-mode — runs directly in Node.js background for local dev, dispatches to Inngest in production. Both paths call the same helper.

---

## 6 · Settings UI — Independent Integration Cards
**Date:** 2026-08-01

**Problem:** Settings page had no integration management UI.

**What changed:**
| File | Change |
|------|--------|
| `src/app/settings/page.tsx` | Built independent cards for Gmail & Calendar with dynamic status badges, Connect links (OAuth redirect), and Disconnect buttons enabled across all states including `SYNCING` |

---

## 7 · Inbox & Calendar — Empty States & Syncing Banners
**Date:** 2026-08-01

**Problem:** Inbox/Calendar pages showed broken empty lists when disconnected. No indication when sync was in progress.

**What changed:**
| File | Change |
|------|--------|
| `src/app/_components/gmail-panel.tsx` | Added "Gmail is Not Connected → Go to Settings" CTA. Added blue syncing banner with spinner. Fixed missing `Loader2` import |
| `src/app/_components/calendar-panel.tsx` | Added "Calendar is Not Connected → Go to Settings" CTA. Added syncing banner |

---

## 8 · AI Chat — Dynamic Integration Context & Guardrails
**Date:** 2026-08-01

**Problem:** AI would hallucinate email data when Gmail was disconnected, or try calendar operations when Calendar wasn't set up.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | System prompt now includes live integration status (`CONNECTED`, `DISCONNECTED`, `SYNCING` etc.) and guardrail rules: refuse email questions when Gmail disconnected, inform user when syncing, direct to Settings when reconnect required |

---

## 9 · Multi-Account Webhook Resolution
**Date:** 2026-08-01

**Problem:** Gmail Pub/Sub webhook couldn't resolve the correct tenant when the connected Gmail account email differed from the login email (e.g., login with personal, connect work Gmail).

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/webhooks/route.ts` | Resolves tenant ID by matching `corsairAccounts.accountEmail` instead of assuming login email |

---

## 10 · KEK Rotation Resilience
**Date:** 2026-08-01

**Problem:** Changing `CORSAIR_KEK` in `.env` caused Corsair config decryption to fail permanently. The app couldn't recover.

**What changed:**
| File | Change |
|------|--------|
| `src/server/lib/corsair-init.ts` | On decryption failure, resets `config: {}` and `dek: null` in Postgres, then issues a fresh DEK. Credentials get re-encrypted on next OAuth connect |

---

## 11 · Legacy Auto-Sync Removal
**Date:** 2026-08-01

**Problem:** `app-layout.tsx` fetched `/api/auth/sync` on every mount — a leftover from the old architecture that conflicted with the new progressive integration flow.

**What changed:**
| File | Change |
|------|--------|
| `src/app/app-layout.tsx` | Removed legacy `/api/auth/sync` fetch |
| `src/app/api/auth/sync/route.ts` | Deprecated to return `200 OK` no-op |

---

## 12 · Client-Side Caching — Global staleTime
**Date:** 2026-08-01

**Problem:** Every page navigation triggered fresh tRPC fetches. Inbox → Calendar → back to Inbox = 3 full round-trips for the same data.

**What changed:**
| File | Change |
|------|--------|
| `src/trpc/query-client.ts` | Set global default `staleTime` to 2 minutes. Inbox/Calendar data now served from memory cache during navigation |

---

## 13 · Per-Query Cache Overrides
**Date:** 2026-08-01

**Problem:** Global 2-minute staleTime was too long for status-sensitive queries (integration status, active chat). Too short for sidebar.

**What changed:**
| File | Query | staleTime | refetchOnWindowFocus |
|------|-------|-----------|---------------------|
| `src/app/settings/page.tsx` | `integrations.getStatus` | 10s | ✅ (already had) |
| `src/app/_components/gmail-panel.tsx` | `integrations.getStatus` | 10s | — |
| `src/app/_components/calendar-panel.tsx` | `integrations.getStatus` | 10s | — |
| `src/app/chat/page.tsx` | `chat.getChatHistory` | 30s | ✅ |
| `src/app/app-layout.tsx` | `chat.getChats` | 60s | ✅ |

---

## 14 · Auto-Polling During SYNCING State
**Date:** 2026-08-01

**Problem:** After connecting Gmail, Settings badge showed "Syncing..." but never automatically updated to "Connected" — user had to manually refresh.

**What changed:**
| File | Change |
|------|--------|
| `src/app/_components/gmail-panel.tsx` | Added `refetchInterval` — polls every 3s while `gmail.status === "SYNCING"`, auto-stops otherwise |
| `src/app/_components/calendar-panel.tsx` | Added `refetchInterval` — polls every 3s while `calendar.status === "SYNCING"` |

**Result:** UI transitions from `Syncing...` → `Connected` within 3 seconds of background sync completing. Zero manual refresh.

---

## 15 · FK Constraint Fix on Disconnect
**Date:** 2026-08-01

**Problem:** Disconnect button crashed with `corsair_events_account_id_corsair_accounts_id_fk` FK violation. The `corsair_events` table (sync audit log) references `corsair_accounts` and wasn't being cleaned up.

**What changed:**
| File | Change |
|------|--------|
| `src/server/api/routers/integrations.ts` | Imported `corsairEvents`. Added `db.delete(corsairEvents)` before `db.delete(corsairAccounts)` in disconnect procedure |

---

## 16 · Reduce Sync Batch to 20 & Inbox Pagination
**Date:** 2026-08-01

**Problem:** Initial backfill fetched 50 emails. User wanted 20, and the inbox displayed all emails in one scrollable list with no pagination.

**What changed:**
| File | Change |
|------|--------|
| `src/inngest/functions.ts` | `maxResults: 50` → `maxResults: 20` in initial Gmail backfill |
| `src/app/_components/gmail-panel.tsx` | Added `page` state + `PAGE_SIZE = 20`. Query uses `offset: (page - 1) * PAGE_SIZE`. Added Previous/Next pagination bar with page counter and item range. `setPage(1)` on search submit |

---

## 17 · Differentiate "Connected" from "Syncing"
**Date:** 2026-08-01

**Problem:** During sync, the UI just said "Syncing..." — no indication that the OAuth connection itself was successful. User wanted to see "Gmail is connected, inbox is syncing mails."

**What changed:**
| File | Change |
|------|--------|
| `src/app/settings/page.tsx` | `SYNCING` state now shows **two badges**: green `Connected (email)` + blue `Syncing data...` with spinner |
| `src/app/_components/gmail-panel.tsx` | Banner reads: *"Gmail Connected (email) • Syncing emails in the background..."* |
| `src/app/api/chat/route.ts` | System prompt: `CONNECTED (email) - Syncing inbox emails`. Guardrail: *"Gmail is connected and emails are currently syncing"* |

---

## 18 · Chat Page Connect CTAs *(Added then Reverted)*
**Date:** 2026-08-02

**Problem:** Wanted Connect Gmail/Calendar buttons directly on the `/chat` page so users don't have to navigate to Settings.

**What happened:**
1. Added `integrations.getStatus` query + inline CTA banner to `src/app/chat/page.tsx`
2. Initially set 60s staleTime — flagged as inconsistent with Settings (10s)
3. Aligned to 10s + polling to match Settings config
4. **User decided to revert** — removed status query and CTA banner entirely

**Final state:** Chat page has no integration status fetching or connection prompts.

---

## 19 · System Prompt & Guardrails Optimization
**Date:** 2026-08-02

**Problem:** System prompt had several operational gaps: hardcoded `Asia/Kolkata` timezone, missing `ERROR` state guardrail, unguided multi-step email reply/thread construction, missing batch operation guidance, and unclarified restricted operations.

**What changed:**
| File | Change |
|------|--------|
| `src/server/lib/schemas.ts` | Added optional `timezone` field to `ChatRequestSchema` |
| `src/app/chat/page.tsx` | Passed browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) in `sendMessage` request body |
| `src/app/api/chat/route.ts` | Overhauled system prompt: dynamic timezone interpolation, explicit `ERROR` status guardrail, 5-step tool budget rule, proper RFC 2822 MIME & thread reply headers example, batchModify bulk operation example, and clarified `⛔ PERMANENTLY RESTRICTED` operations |

**Result:** AI now accurately respects user local timezone, correctly constructs threaded email replies, handles batch actions, and enforces security guardrails.

---

## 20 · Prompt Builder & Dedicated Email Tools Refactoring
**Date:** 2026-08-02

**Problem:** Giant system prompt template string bloated the chat route, MIME/base64 email composition was error-prone when executed by the LLM, and prompt examples consumed unnecessary tokens on simple queries.

**What changed:**
| File | Change |
|------|--------|
| `src/server/lib/gmail-helpers.ts` | **[NEW]** — Server-side helper module (`sendEmail`, `replyToMessage`) using Corsair's key manager. Handles RFC 2822 MIME formatting, `In-Reply-To`, `References`, and `threadId` headers so the LLM never constructs raw MIME. |
| `src/server/lib/prompt-builder.ts` | **[NEW]** — Modular prompt builder (`buildSystemPrompt`). Formats ISO timestamps with explicit UTC offsets (`+05:30`), modularizes sections, and conditionally injects heavy example blocks based on user query keywords (`send`, `reply`, `schedule`, etc.). |
| `src/app/api/chat/route.ts` | Refactored route to use `buildSystemPrompt()`. Registered dedicated `send_email` and `reply_to_message` AI tools when Gmail is connected. Fixed duplicate `catch` block. |

**Result:** Leaner system prompt, 100% reliable MIME formatting for email composition & threaded replies, conditional token savings, and clean route architecture.

---

## 21 · Local Timezone Prompt Formatting Fix
**Date:** 2026-08-02

**Problem:** `new Date().toISOString()` outputs a UTC timestamp (`Z`), e.g., `2026-08-01T22:00:00Z` when it is `2026-08-02 03:30 AM` in `Asia/Kolkata` (UTC+5:30). The LLM misread the date as "yesterday" / 10 PM.

**What changed:**
| File | Change |
|------|--------|
| `src/server/lib/prompt-builder.ts` | Updated `buildUserSection` to include explicit `Current local date & time` formatted via `toLocaleString('en-US', { timeZone: ctx.timezone, dateStyle: 'full', timeStyle: 'medium' })` alongside UTC timestamp, with explicit instructions for relative date calculations. |

**Result:** AI now accurately reads the user's current local date and time (`Sunday, August 2, 2026 at 3:30 AM`).

---

## 22 · Drafts Bad Request Fix & Dedicated `create_draft` Tool
**Date:** 2026-08-02

**Problem:** `[corsair:gmail:drafts.create]` failed with `400 Bad Request` because the AI passed `{ userId: 'me', resource: { message: ... } }`. Google's Gmail API expects `{ draft: { message: { raw: "..." } } }` (or plain MIME via the drafts endpoint).

**What changed:**
| File | Change |
|------|--------|
| `src/server/lib/gmail-helpers.ts` | Added `createDraft({ tenantId, from, to, subject, body })` server-side helper function. |
| `src/app/api/chat/route.ts` | Registered `create_draft` dedicated AI tool when Gmail is connected. |
| `src/server/lib/prompt-builder.ts` | Documented `create_draft` dedicated tool and added `{ draft: { message: { raw } } }` schema wrapper rule for `run_script`. |

**Result:** AI now creates draft emails reliably through `create_draft` without schema errors or 400 Bad Request failures.

---

## 23 · Chat Stream Error & Running Operations State Fix
**Date:** 2026-08-02

**Problem:** When an API stream error occurred (e.g. rate limit quota 429), `isLoading` evaluated to `true` (because `status !== 'ready'`). This caused `Running operations...` with an animated pulse spinner to persist indefinitely in the chat bubble even though the stream had failed.

**What changed:**
| File | Change |
|------|--------|
| `src/app/chat/page.tsx` | Updated `isLoading` definition to `(status === 'submitted' || status === 'streaming') && !chatError`. Added condition to suppress empty assistant message bubbles when an error occurs. |

**Result:** `Running operations...` spinner now stops immediately when an error or quota limit is encountered, and the error notification banner displays cleanly.

---

## 24 · API Key Quota & Rate Limit Error Banner Handling
**Date:** 2026-08-02

**Problem:** When free tier AI quota (50 queries/mo) was reached, missing API keys occurred, or Gemini free tier rate limits (20 req/day) were hit, the backend returned a generic `"❌ Something went wrong. Please try again."` response with status 500.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Overhauled catch block to detect `isQuotaViolation` (monthly 50 quota limit), `isMissingKey` / `isInvalidKey`, and `isQuotaError` (429 rate limit / `RESOURCE_EXHAUSTED`). Returns specific `⚠️` error message strings with proper HTTP status codes (401, 429, 400). |
| `src/app/chat/page.tsx` | Enhanced `onError` handler to parse raw error streams and display clean, actionable error banners telling the user whether to wait, switch models, or configure an API key in Settings. |

**Result:** Users now see clear, actionable error banners (e.g. *"⚠️ Monthly free AI quota reached! Please configure your own API key in Settings"*) instead of generic error popups.

---

## 25 · Custom Stream Error Formatting (`getErrorMessage`)
**Date:** 2026-08-02

**Problem:** By default, Vercel AI SDK's `toUIMessageStreamResponse()` masks stream-level errors with the generic string `"An error occurred."` for security reasons. This caused quota (429) or stream errors to display as `"An error occurred."` on the frontend.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Provided custom `getErrorMessage: (error) => string` handler in `toUIMessageStreamResponse()`. Parses stream errors (`Quota Violation`, `RESOURCE_EXHAUSTED`, 429, missing keys) and transmits detailed `⚠️` error strings over the stream. |
| `src/app/chat/page.tsx` | Updated `onError` fallback to catch `"An error occurred."` strings and replace them with an actionable banner (*"⚠️ API rate limit or key error. Please wait a minute or configure your own API key in Settings"*). |

**Result:** Stream errors are no longer masked as generic `"An error occurred."`. Users now see exact rate limit, quota, and key guidance in the UI banner.

---

## 26 · TypeScript Fix for `toUIMessageStreamResponse`
**Date:** 2026-08-02

**Problem:** `toUIMessageStreamResponse()` accepts standard `ResponseInit` and SSE options, but does not accept `getErrorMessage` (which is specific to `toDataStreamResponse`). Passing `getErrorMessage` caused TypeScript error `TS2345: Object literal may only specify known properties`.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Removed invalid `getErrorMessage` parameter from `toUIMessageStreamResponse()`. Left client-side `onError` handler in `chat/page.tsx` responsible for mapping generic stream errors to user-friendly banners. |

**Result:** Code compiles cleanly with zero TypeScript errors.

---

## 27 · Tool Error Capture & Anti-Hallucination Guardrails
**Date:** 2026-08-02

**Problem:** When a Google API call inside `run_script` returned `400 Bad Request` (e.g. `messages.send` or `drafts.create` with invalid parameters), Corsair caught the error and returned `{ error: 'Bad Request' }`. The LLM ignored the error object and falsely claimed to the user that the email/draft was created successfully.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Wrapped `t.handler()` execution in a `try/catch` block that inspects return values for `{ error }`. Returns explicit `{ success: false, error: ... }` objects to the LLM when Corsair tool calls fail. |
| `src/server/lib/prompt-builder.ts` | Added strict system prompt guardrails: *"If a tool call returns `{ success: false, error: ... }`, the operation FAILED. Report the exact error to the user cleanly. NEVER claim an email was sent, created, or modified if a tool call returned an error or failed."* |

**Result:** The AI no longer hallucinates success when tool execution fails; it reports API errors directly to the user.

---

## 28 · Hard-Block Send/Draft in `run_script`
**Date:** 2026-08-02

**Problem:** Despite Session 27's error wrapper and prompt guardrails, the LLM continued using `run_script` to call `corsair.gmail.api.messages.send()` and `corsair.gmail.api.drafts.create()` with incorrect schemas (wrapping in `resource: { raw }` or `resource: { message }`), causing repeated `400 Bad Request` errors. The error wrapper in `route.ts` couldn't catch these because Corsair logged the error internally but `run_script`'s handler returned `undefined` (no `return` in the script), bypassing the error detection.

**Root cause:** Prompt-level instructions ("use dedicated tools") are suggestions the LLM can ignore. The LLM needs a hard code-level block.

**What changed:**
| File | Change |
|------|--------|
| `src/server/lib/quota.ts` | Added `.messages.send`, `.drafts.create`, `.drafts.send` to `validateRestrictedOperations()` regex patterns. Scripts containing these calls now throw `Safety Violation` before execution. |
| `src/server/lib/prompt-builder.ts` | Updated `buildRunScriptSection()` to explicitly list blocked APIs with ⛔ prefix. Removed the old hint about `drafts.create` schema (no longer relevant since it's blocked). Always include email tool instructions when Gmail is connected (not just conditionally on keyword match). |

**Result:** `messages.send` / `drafts.create` / `drafts.send` are now **impossible** to call via `run_script` — the code validator throws before execution. The LLM is forced to use `send_email`, `reply_to_message`, or `create_draft` dedicated tools which handle MIME formatting correctly.

---

## 29 · Fix `send_email` Tool Not Registering (SYNCING Status)
**Date:** 2026-08-02

**Problem:** The `send_email`, `reply_to_message`, and `create_draft` tools were not available to the LLM. The chatbot responded *"The send_email tool is not available"*. Root cause: tool registration was gated on `gmailStatus === 'CONNECTED'`, but the account status was `'SYNCING'` — a valid functional state with a working OAuth token, just not yet fully synced.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Broadened tool registration condition to accept both `'CONNECTED'` and `'SYNCING'` statuses. Added `console.log` with Gmail status/email/registration result for debugging. |

**Result:** Dedicated email tools now register whenever Gmail has a functional connection (CONNECTED or SYNCING), fixing the "tool not available" error.

---

## 30 · Fix `accountEmail` Null + Disable 429 Retries
**Date:** 2026-08-02

**Problem:** Two issues discovered:
1. `[Chat API] Gmail status: CONNECTED, email: none, tools registered: false` — the `accountEmail` column in `corsair_accounts` was null because the account was connected before the `accountEmail` column was added. Session 29's SYNCING fix was correct but insufficient — the real gate was the null email.
2. Gemini 429 quota errors triggered 3 automatic retries inside `streamText` (default `maxRetries: 2`), wasting ~60s before failing. The error then fired mid-stream via `onError` callback, and the already-sent HTTP 200 couldn't be changed.

**What changed:**
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Added `session?.user?.email` fallback: `senderEmail = gmailAcc?.accountEmail \|\| session?.user?.email`. Tool registration now gates on `gmailConnected && senderEmail` instead of requiring `accountEmail`. The `From:` header and system prompt both use the fallback. |
| `src/app/api/chat/route.ts` | Added `maxRetries: 0` to `streamText()` to prevent the SDK from retrying 429 errors 3 times. Errors fail fast and reach the outer catch block, which returns proper `⚠️` error messages. |

**Result:** `send_email` / `reply_to_message` / `create_draft` tools now register even when `accountEmail` is null (falls back to login email). Rate limit errors fail immediately instead of wasting 60s on retries.
