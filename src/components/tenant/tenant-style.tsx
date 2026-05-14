import type { Tenant } from "@/lib/tenants";

/**
 * Injeta as CSS vars do tenant no documento.
 * Renderizado no <head> via dangerouslySetInnerHTML para evitar flash
 * de cores erradas (FOUC).
 */
export function TenantStyle({ tenant }: { tenant: Tenant }) {
  const css = `:root{
    --primary:${tenant.primary};
    --primary-hover:${tenant.primaryHover};
    --primary-fg:${tenant.primaryFg};
    --primary-soft:${tenant.primarySoft};
    --primary-border:${tenant.primaryBorder};
    --secondary:${tenant.secondary};
    --secondary-soft:${tenant.secondarySoft};
    --secondary-fg:${tenant.secondaryFg};
  }`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
