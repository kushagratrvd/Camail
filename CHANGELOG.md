# Changelog

All notable changes to Camail will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Security & Architecture
- Decouple Gmail and Google Calendar OAuth integrations from initial Better Auth registration (reduced sign-in scopes to `openid`, `profile`, `email`)
- Implement progressive per-plugin OAuth connection & disconnection via Settings page
- Add `corsair_webhooks` table storing `channel_id`, `resource_id`, `history_id`, and expiration dates for 24h renewal & clean `channels.stop()` disconnection
- Add explicit integration status tracking (`CONNECTED`, `SYNCING`, `RECONNECT_REQUIRED`, `DISCONNECTED`, `ERROR`) on `corsair_accounts` table
- Implement non-blocking async post-OAuth Inngest event handler (`handleIntegrationConnected`) for initial 50-item backfills and webhook registration
- Add multi-account email extraction from Google UserInfo API (`accountEmail`) and multi-account tenant lookup in Gmail Pub/Sub webhooks
- Pass dynamic integration status context to AI system prompt in `/api/chat`

### Added
- `src/components/markdown-renderer.tsx` — rich Markdown rendering component for chat message bubbles supporting bold text, lists, headers, code blocks, links, blockquotes (`>`), and horizontal rules (`---` / `***`)
- `TRUSTED_ORIGINS` environment variable — optional comma-separated list of additional trusted origins for Better Auth CORS validation
- `src/server/api/routers/integrations.ts` — tRPC router for integration status queries & idempotent disconnection procedures

### Changed
- `src/server/auth.ts`: dynamically derive Better Auth `trustedOrigins` from `BETTER_AUTH_URL` and optional `TRUSTED_ORIGINS` env variable instead of hardcoded strings
- Chat page: message bubbles now render full formatted Markdown (**Subject:** bolding, structured lists, quotes) instead of plain text strings
- Chat API route: updated email body script helper and system prompt to strip raw HTML tags (`<!DOCTYPE html>`, `<style>`, etc.) before summarizing emails
- Settings page: independent cards for Gmail & Google Calendar with dynamic status badges, Connect buttons, and Disconnect actions
- Inbox & Calendar components: render clean empty states with Settings CTAs when disconnected or syncing
- `next.config.js`: updated CSP `script-src` directive to include `'unsafe-inline'` for Next.js inline script hydration and Turbopack dev mode support

---

## [0.1.0] - 2026-08-01

### Security
- Migrated API key storage from plaintext `localStorage` to AES-256-GCM encrypted server-side Postgres storage
- Added Content Security Policy (CSP) and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)
- Removed API keys from client-side chat request body — keys are now resolved server-side via the service layer

### Added
- `user_api_keys` database table for encrypted per-user API key storage
- `src/server/services/api-keys.ts` — service layer handling key encryption, decryption, masking, and CRUD
- `src/server/api/routers/apiKeys.ts` — thin tRPC router for key management
- `ENCRYPTION_SECRET` environment variable for AES-256-GCM API key encryption
- Masked key display in Settings page (showing first 4 and last 4 characters, e.g. `AIza••••k9Xf`)
- "Delete All Keys" button in Settings page

### Changed
- Settings page: API key inputs now save via server-side tRPC mutation instead of `localStorage`
- Chat page: removed inline API key side-panel sheet; keys are resolved server-side
- `ChatRequestSchema`: removed `keys` field from request body validation

### Removed
- `localStorage` storage of `corsair_custom_keys`
- Client-side transmission of API keys in chat POST requests
