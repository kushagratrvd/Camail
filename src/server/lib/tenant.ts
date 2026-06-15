import { corsair } from "@/server/corsair";
import { auth } from "@/server/auth";
import { headers } from "next/headers";

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

  const { renewWatchesIfNeeded } = await import("./watch-renewal");
  renewWatchesIfNeeded(tenantId).catch(console.error);

  return corsair.withTenant(tenantId);
}
