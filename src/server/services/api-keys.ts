import { db } from '@/server/db';
import { userApiKeys } from '@/server/db/user-api-keys';
import { encryptValue, decryptValue } from '@/server/lib/crypto';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mask a key to show first 4 + last 4 chars: `sk-p••••a3Bf` */
function maskKey(raw: string): string {
  if (raw.length <= 8) return '••••••••';
  return `${raw.slice(0, 4)}••••${raw.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt and upsert API keys for a user.
 * Only non-empty values are written; omitted keys are left unchanged.
 */
export async function saveKeys(
  userId: string,
  keys: { google?: string; openai?: string; anthropic?: string },
): Promise<void> {
  const existing = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  const googleKeyEnc =
    keys.google?.trim() ? encryptValue(keys.google.trim()) : (existing?.googleKeyEnc ?? null);
  const openaiKeyEnc =
    keys.openai?.trim() ? encryptValue(keys.openai.trim()) : (existing?.openaiKeyEnc ?? null);
  const anthropicKeyEnc =
    keys.anthropic?.trim() ? encryptValue(keys.anthropic.trim()) : (existing?.anthropicKeyEnc ?? null);

  await db
    .insert(userApiKeys)
    .values({
      userId,
      googleKeyEnc,
      openaiKeyEnc,
      anthropicKeyEnc,
    })
    .onConflictDoUpdate({
      target: userApiKeys.userId,
      set: {
        googleKeyEnc,
        openaiKeyEnc,
        anthropicKeyEnc,
        updatedAt: new Date(),
      },
    });
}

/**
 * Returns masked hints for each stored key, or null if not set.
 * Never returns the raw key — only first/last 4 chars.
 */
export async function getKeyStatus(
  userId: string,
): Promise<{ google: string | null; openai: string | null; anthropic: string | null }> {
  const row = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) {
    return { google: null, openai: null, anthropic: null };
  }

  const decryptAndMask = (enc: string | null): string | null => {
    if (!enc) return null;
    const raw = decryptValue(enc);
    return raw ? maskKey(raw) : null;
  };

  return {
    google: decryptAndMask(row.googleKeyEnc),
    openai: decryptAndMask(row.openaiKeyEnc),
    anthropic: decryptAndMask(row.anthropicKeyEnc),
  };
}

/**
 * Fetch and decrypt raw API keys for server-side use (e.g. chat route).
 * NEVER expose the return value to the client.
 */
export async function getDecryptedKeys(
  userId: string,
): Promise<{ google?: string; openai?: string; anthropic?: string }> {
  const row = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row) return {};

  const result: { google?: string; openai?: string; anthropic?: string } = {};

  if (row.googleKeyEnc) {
    const v = decryptValue(row.googleKeyEnc);
    if (v) result.google = v;
  }
  if (row.openaiKeyEnc) {
    const v = decryptValue(row.openaiKeyEnc);
    if (v) result.openai = v;
  }
  if (row.anthropicKeyEnc) {
    const v = decryptValue(row.anthropicKeyEnc);
    if (v) result.anthropic = v;
  }

  return result;
}

/**
 * Delete all stored API keys for a user.
 */
export async function deleteKeys(userId: string): Promise<void> {
  await db.delete(userApiKeys).where(eq(userApiKeys.userId, userId));
}
