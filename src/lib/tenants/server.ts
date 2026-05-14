import { headers, cookies } from "next/headers";
import { DEFAULT_TENANT_ID, getTenant, isTenantId, type Tenant } from "./config";

/**
 * Lê o tenant atual a partir do header injetado pelo middleware
 * (ou do cookie como fallback). Use em Server Components, Server Actions
 * e Route Handlers.
 */
export async function getCurrentTenant(): Promise<Tenant> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-tenant-id");
  if (fromHeader && isTenantId(fromHeader)) return getTenant(fromHeader);

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("tenant")?.value;
  if (fromCookie && isTenantId(fromCookie)) return getTenant(fromCookie);

  return getTenant(DEFAULT_TENANT_ID);
}
