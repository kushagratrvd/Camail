import { corsair } from "@/server/corsair";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { eq, and } from "drizzle-orm";
import { accounts } from "@/server/db/auth-schema";

export async function getTenantId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id;
}

export async function getTenant() {
  const tenantId = await getTenantId();

  if (!tenantId) {
    throw new Error("No tenantId found");
  }

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, tenantId), eq(accounts.providerId, "google")))
    .limit(1);

  const googleAccount = userAccounts[0];

  if (googleAccount) {
    if (googleAccount.accessToken) {
      await corsair.withTenant(tenantId).gmail.keys.set_access_token(googleAccount.accessToken);
      await corsair.withTenant(tenantId).googlecalendar.keys.set_access_token(googleAccount.accessToken);
    }
    if (googleAccount.refreshToken) {
      await corsair.withTenant(tenantId).gmail.keys.set_refresh_token(googleAccount.refreshToken);
      await corsair.withTenant(tenantId).googlecalendar.keys.set_refresh_token(googleAccount.refreshToken);
    }
  }

  return corsair.withTenant(tenantId);
}
