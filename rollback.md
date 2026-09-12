# 🛡️ Safety Net & Rollback Plan

> Safety net protocol and revert instructions before making high-risk edits or major structural changes.

---

## 📍 Pre-Change Checkpoints

Before touching any risky module (e.g. database schema changes, authentication handlers, or core chat streaming routes):

1. Ensure all git changes are stashed or committed:
   ```bash
   git status
   git add .
   git commit -m "checkpoint: before [feature/refactor name]"
   ```
2. Save current working commit hash:
   ```bash
   git rev-parse HEAD
   ```

---

## ⏪ Rollback Instructions

If a change introduces breaking runtime errors, database corruption, or unexpected regressions:

### 1. Code Revert
```bash
# Hard revert to recent commit checkpoint
git reset --hard HEAD~1

# Or reset to specific commit hash
git reset --hard <commit-hash>
```

### 2. Clean Node & Build Cache
```bash
rm -rf .next node_modules/.cache
pnpm install
```

### 3. Database Schema Revert (If migrations were pushed)
- If a schema change was pushed via `drizzle-kit push` and needs to be undone:
  1. Revert `src/server/db/schema.ts` to prior working version.
  2. Run `npx drizzle-kit push` to synchronize remote Postgres schema back to previous state.
  3. Verify connection via `pnpm dev`.

### 4. Post-Rollback Verification
Run the verification commands from `test-checklist.md`:
```bash
pnpm typecheck
pnpm build
```
