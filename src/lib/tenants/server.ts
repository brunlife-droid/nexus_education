import { headers, cookies } from "next/headers";
import {
  DEFAULT_TENANT_ID,
  isTenantId,
  type Tenant,
  type TenantId,
} from "./config";
import { loadTenantFromDb } from "./db";

/**
 * Lê o tenant atual a partir do header injetado pelo middleware
 * (ou do cookie como fallback) e carrega o registro do DB.
 *
 * Sem `DATABASE_URL` ou se a row não existir, cai pra config in-code
 * (mesma forma do `Tenant`). Use em Server Components, Server Actions
 * e Route Handlers.
 */
export async function getCurrentTenant(): Promise<Tenant> {
  const id = await resolveTenantId();
  return loadTenantFromDb(id);
}

async function resolveTenantId(): Promise<TenantId> {
  const headerStore = await headers();
  const fromHeader = headerStore.get("x-tenant-id");
  if (fromHeader && isTenantId(fromHeader)) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("tenant")?.value;
  if (fromCookie && isTenantId(fromCookie)) return fromCookie;

  return DEFAULT_TENANT_ID;
}
