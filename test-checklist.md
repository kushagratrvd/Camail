# ✅ System Verification & Testing Checklist

> Concrete list of automated commands and manual verification procedures to run before marking any task as done.

---

## 💻 Automated Build & Typecheck Commands

Run all of these in terminal before declaring any feature or bug fix complete:

```bash
# 1. Typecheck TypeScript across all files
pnpm typecheck

# 2. ESLint check
pnpm lint

# 3. Format check
pnpm format:check

# 4. Full Next.js production build check
pnpm build
```

---

## 🗄️ Database Verification Commands (When schema changes)

```bash
# Generate SQL migration file
npx drizzle-kit generate

# Apply migration to database
npx drizzle-kit push
```

---

## 🧪 Manual Verification Flows

### 1. Navigation & App Layout
- [ ] Sign in with Google → lands on `/chat`.
- [ ] Click through sidebar navigation: Home (`/chat`), Inbox (`/inbox`), Calendar (`/calendar`), Activity (`/activity`), Automations (`/automations`), Settings (`/settings`), Docs (`/docs`).
- [ ] Collapse and expand sidebar → layout resizes cleanly.
- [ ] Toggle dark/light theme → theme updates instantly without flicker.

### 2. AI Chat & Tools
- [ ] Open `/chat` → send text prompt `"List my latest 3 emails"`.
- [ ] Verify AI invokes Corsair tools and returns structured email summary.
- [ ] Try sending an email prompt → verify `send_email` tool handles email without MIME errors.
- [ ] Verify restricted operations (`messages.delete`, `events.delete`) are safely rejected.

### 3. Progressive Integrations & OAuth
- [ ] Go to `/settings` → check status of Gmail and Google Calendar.
- [ ] Click "Connect Gmail" → complete OAuth flow → verify status updates to `SYNCING` then `CONNECTED`.
- [ ] Click "Disconnect" → verify clean 3-step deletion of accounts, webhooks, and entities.

### 4. API Key Encryption (BYOK)
- [ ] Save an API key in `/settings` → toast confirms saving.
- [ ] Refresh page → verify key display shows masked string (`sk-p••••a3Bf`).
- [ ] Inspect browser `localStorage` → verify plaintext API key is NOT stored in browser.

### 5. Automations / Scheduler
- [ ] Navigate to `/automations` → view `Automations` and `Runs` tabs.
- [ ] Click "New Automation" → fill name, prompt, schedule → save.
- [ ] Click "Run Now" → verify manual execution completes and output appears under `Runs` tab.
- [ ] Click run entry → verify full markdown detail view renders cleanly with execution duration.
