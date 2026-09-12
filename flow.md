# 🔄 Execution Flow Map

> Maps how execution travels across the codebase for major system flows: entry points, function call sequences, and database interactions.

---

## 1. Authentication & Route Guard Flow

```
User visits page (e.g. /chat)
   │
   ▼
[src/app/app-layout.tsx] AppLayout
   │
   ├─► Check session via Better Auth (useSession hook)
   │     ├─► If Unauthenticated & Non-Public Route: router.replace("/")
   │     └─► If Authenticated: Render App Shell + Navigation Sidebar
   │
   └─► Landing Page (/)
         └─► Sign In Click ──► Better Auth Google Provider (openid, profile, email only)
```

---

## 2. Integration Connection & Sync Flow (Gmail / Calendar)

```
User clicks "Connect Gmail" in /settings
   │
   ▼
[src/app/api/connect/route.ts] GET /api/connect?plugin=gmail&tenantId=...
   │
   ├─► needsConsentPrompt(plugin, tenantId) — checks corsair_accounts status
   ├─► generateOAuthUrl(corsair, plugin, { tenantId, redirectUri, prompt? })
   ├─► Set httpOnly cookie: oauth_state
   └─► Redirect user to Google Consent Screen
         │
         ▼ User authorizes — Google calls back to /api/auth (Better Auth built-in handler)
[src/server/auth.ts / Better Auth callback]
   │
   ├─► Store OAuth tokens via Corsair
   ├─► Set corsair_accounts status = 'SYNCING'
   └─► Send Inngest Event: "integration.connected" { tenantId, plugin }
         │
         ▼
[src/inngest/functions.ts] handleIntegrationConnected
   ├─► Step 1: Register Gmail/Calendar webhook & save metadata to corsair_webhooks
   │           (historyId + watchExpiration for Gmail; channelId + channelExpiration for Calendar)
   ├─► Step 2: Fetch initial ~20 messages/events to warm corsair_entities cache
   └─► Step 3: Update corsair_accounts status → 'CONNECTED' (idempotency: skips if DISCONNECTED)
               On error → status = 'ERROR', statusError = message
```

---

## 3. AI Chat Execution Flow

```
User sends message in UI (/chat)
   │
   ▼
POST /api/chat  [src/app/api/chat/route.ts]
   │
   ├─► 1. Validate request body (ChatRequestSchema via zod)
   ├─► 2. Authenticate user, get tenantId (src/server/lib/tenant.ts → Better Auth session)
   ├─► 3. Fetch decrypted API keys from DB (src/server/services/api-keys.ts)
   ├─► 4. Enforce AI quota if no custom key (src/server/lib/quota.ts → enforceAiQuota)
   │       — 50 AI requests/month limit per user on free tier
   ├─► 5. getTenant() → Corsair SDK synced tenant instance (also renews watches if needed)
   ├─► 6. Build Corsair MCP tool definitions via buildCorsairToolDefs()
   │       + Register dedicated tools: send_email, reply_to_message, create_draft
   ├─► 7. Build System Prompt (src/server/lib/prompt-builder.ts)
   │       — includes identity, integration status, timezone, quota/safety guardrails
   ├─► 8. streamText() via Vercel AI SDK
   │       ├─► LLM decides to call tools → Corsair executes Gmail/Calendar API calls
   │       ├─► Script execution validated via validateScriptSafety + validateRestrictedOperations
   │       └─► Tool results fed back to LLM; continues up to 5 steps
   └─► 9. Stream response to client (toUIMessageStreamResponse)
         │
         ▼  [Client-side: src/app/chat/page.tsx]
         └─► On stream complete: client calls api.chat.saveChatHistory (tRPC mutation)
               to persist conversation in corsair_chats table
```

---

## 4. Webhook Push Event Flow (Gmail & Google Calendar)

```
Google Pub/Sub Push Notification arrives
   │
   ▼
POST /api/webhooks  [src/app/api/webhooks/route.ts]
   │
   ├─► Decode encrypted tenantId from query param (decryptTenantId)
   ├─► If tenantId missing: decode Pub/Sub base64 message body
   │     → extract emailAddress → lookup corsairAccounts.accountEmail
   │     → fallback: lookup users.email if no account match
   ├─► Forward to Inngest: inngest.send('gmail.webhook.received', { activeTenantId, headersObj, body })
   └─► Return 200 immediately (Inngest handles async processing)
         │
         ▼  [Async - Inngest]
[src/inngest/functions.ts] syncGmailWebhook
   ├─► processWebhook(corsair, headersObj, body, { tenantId })
   └─► Corsair SDK updates local entity cache in corsair_entities
```

---

## 5. Webhook Renewal Flow (Daily Cron)

```
[src/inngest/functions.ts] renewExpiringWebhooks  — cron: '0 0 * * *'
   │
   ├─► Query corsair_webhooks where watchExpiration OR channelExpiration < now+24h
   ├─► For each expiring watch:
   │     ├─► Get access token via createAccountKeyManager
   │     ├─► Gmail: registerGmailWebhook → update historyId + watchExpiration in DB
   │     └─► Calendar: registerGoogleCalendarWebhook → update channelId + channelExpiration in DB
   └─► Return { renewed: N }
```

---

## 6. Planned Automation / Scheduler Execution Flow

```
Inngest Cron Poller (Every 5 minutes)
   │
   ▼
[src/inngest/functions.ts] pollDueAutomations
   │
   ├─► Query automations table: status='active' AND nextRunAt <= NOW()
   └─► Dispatch "automation.execute" event per due automation
         │
         ▼
[src/inngest/functions.ts] executeAutomation
   │
   ├─► Create automation_runs record (status = 'running')
   ├─► Call shared AI Service (src/server/services/automation-executor.ts)
   │     ├─► Executes prompt using configured LLM & Corsair tools (non-streaming)
   │     └─► Captures output content & execution duration
   ├─► Update automation_runs (status='succeeded'/'failed', resultContent, durationMs)
   └─► Update automations (lastRunAt = NOW(), nextRunAt = computeNextRun(cron, timezone))
```
