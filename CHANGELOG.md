# Changelog

All notable changes to Camail will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Security
- Migrate API key storage from plaintext `localStorage` to AES-256-GCM encrypted server-side Postgres storage
- Add Content Security Policy (CSP) and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)
- Remove API keys from chat request body — keys now fetched server-side via service layer

### Added
- `user_api_keys` database table for encrypted key storage
- `src/server/services/api-keys.ts` — service layer for key encrypt/decrypt/CRUD
- `src/server/api/routers/apiKeys.ts` — tRPC router for key management
- `ENCRYPTION_SECRET` environment variable for API key encryption
- Masked key display in settings (first/last 4 chars)
- "Delete All Keys" button in settings

### Changed
- Settings page: API key inputs now save via server round-trip instead of localStorage
- Chat page: removed inline API key side-panel; keys resolved server-side
- `ChatRequestSchema` no longer accepts a `keys` field

### Removed
- `localStorage` storage of `corsair_custom_keys`
- Client-side API key transmission in chat request body
