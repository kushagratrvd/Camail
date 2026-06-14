import { corsair } from "@/server/corsair";

export function getTenantId() {
  return process.env.TENANT_ID ?? "kushagra";
}

export function getTenant() {
  return corsair.withTenant(getTenantId());
}
