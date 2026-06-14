import { corsair } from "@/server/corsair";

export function getTenant() {
  const tenantId = process.env.TENANT_ID ?? "kushagra";
  return corsair.withTenant(tenantId);
}
