// Re-exports safe para client e server.
// Para `getCurrentTenant` (server-only, usa next/headers), importe diretamente
// de "@/lib/tenants/server".
export {
  TENANTS,
  ALL_TENANTS,
  DEFAULT_TENANT_ID,
  getTenant,
  isTenantId,
  type Tenant,
  type TenantId,
} from "./config";
