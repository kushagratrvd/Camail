import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TRPCError } from "@trpc/server";

interface QuotaRecord {
  count: number;
  lastReset: string; // YYYY-MM-DD
}

const QUOTA_FILE = path.join(process.cwd(), "src/server/sync-quota.json");
const DAILY_SYNC_LIMIT = 10; // Max 10 syncs per day per user

async function readQuotaData(): Promise<Record<string, QuotaRecord>> {
  try {
    const data = await fs.readFile(QUOTA_FILE, "utf-8");
    return JSON.parse(data) as Record<string, QuotaRecord>;
  } catch (e) {
    return {};
  }
}

async function writeQuotaData(data: Record<string, QuotaRecord>) {
  await fs.mkdir(path.dirname(QUOTA_FILE), { recursive: true });
  await fs.writeFile(QUOTA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function checkAndIncrementSyncQuota(tenantId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const data = await readQuotaData();
  const today = new Date().toISOString().split("T")[0]!; // YYYY-MM-DD
  
  let record = data[tenantId];
  if (!record || record.lastReset !== today) {
    record = { count: 0, lastReset: today };
  }

  if (record.count >= DAILY_SYNC_LIMIT) {
    return { allowed: false, remaining: 0, limit: DAILY_SYNC_LIMIT };
  }

  record.count += 1;
  data[tenantId] = record;
  await writeQuotaData(data);

  return { allowed: true, remaining: DAILY_SYNC_LIMIT - record.count, limit: DAILY_SYNC_LIMIT };
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
