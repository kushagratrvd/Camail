import { db } from "@/server/db";
import { corsairSyncQuotas } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const DAILY_SYNC_LIMIT = 10; // Max 10 syncs per day per user

export async function checkAndIncrementSyncQuota(tenantId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD

  // 1. Fetch quota record from database
  const record = await db
    .select()
    .from(corsairSyncQuotas)
    .where(eq(corsairSyncQuotas.tenantId, tenantId))
    .execute()
    .then((res) => res[0]);

  // 2. Determine count based on reset date
  let currentCount = 0;
  if (record && record.lastReset === today) {
    currentCount = record.count;
  }

  // 3. Check threshold
  if (currentCount >= DAILY_SYNC_LIMIT) {
    return { allowed: false, remaining: 0, limit: DAILY_SYNC_LIMIT };
  }

  const newCount = currentCount + 1;

  // 4. Upsert/update record in database
  await db
    .insert(corsairSyncQuotas)
    .values({
      tenantId,
      count: newCount,
      lastReset: today,
    })
    .onConflictDoUpdate({
      target: corsairSyncQuotas.tenantId,
      set: {
        count: newCount,
        lastReset: today,
      },
    })
    .execute();

  return { allowed: true, remaining: DAILY_SYNC_LIMIT - newCount, limit: DAILY_SYNC_LIMIT };
}

export async function enforceSyncQuota(tenantId: string) {
  const quota = await checkAndIncrementSyncQuota(tenantId);
  if (!quota.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Daily sync limit reached. You can only sync ${quota.limit} times per day to protect global API quotas.`,
    });
  }
  return quota;
}

export function validateScriptSafety(code: string): void {
  const blockedKeywords = [
    /\bprocess\b/,
    /\brequire\b/,
    /\bimport\b/,
    /\bfs\b/,
    /\bpath\b/,
    /\bchild_process\b/,
    /\bexec\b/,
    /\bspawn\b/,
    /\bdatabase\b/,
    /\bconn\b/,
    /\bdb\b/,
    /\beval\b/,
    /\bFunction\b/,
    /\bglobal\b/,
    /__dirname/,
    /__filename/,
  ];

  for (const pattern of blockedKeywords) {
    if (pattern.test(code)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Security Violation: The script contains blocked keywords/symbols (e.g. process, require, fs, db) and has been blocked to protect server integrity.`
      });
    }
  }
}

export function validatePromptSafety(prompt: string): void {
  const injectionPatterns = [
    /ignore\s+(?:the\s+)?(?:previous|system|above)\s+instructions/i,
    /bypass\s+safety/i,
    /override\s+(?:the\s+)?system/i,
    /forget\s+(?:what\s+you\s+were\s+told|previous\s+instructions)/i,
    /system\s+prompt\s+override/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) {
      throw new Error("Safety Violation: Request contains potentially unsafe prompt override patterns.");
    }
  }
}

export function validateRestrictedOperations(code: string): void {
  const restrictedPatterns = [
    /\.messages\.(?:delete|trash)\b/,
    /\.threads\.(?:delete|trash)\b/,
    /\.events\.delete\b/,
  ];

  for (const pattern of restrictedPatterns) {
    if (pattern.test(code)) {
      throw new Error("Safety Violation: Trashing or deleting emails and events is restricted by system safety policies.");
    }
  }
}
