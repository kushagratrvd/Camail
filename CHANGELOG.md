# Changelog

All notable changes to Camail will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- `src/components/markdown-renderer.tsx` — rich Markdown rendering component for chat message bubbles supporting bold text, lists, headers, code blocks, links, blockquotes (`>`), and horizontal rules (`---` / `***`)

### Changed
- Chat page: message bubbles now render full formatted Markdown (**Subject:** bolding, structured lists, quotes) instead of plain text strings
- Chat API route: updated email body script helper and system prompt to strip raw HTML tags (`<!DOCTYPE html>`, `<style>`, etc.) before summarizing emails
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
