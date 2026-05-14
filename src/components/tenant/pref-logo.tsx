import type { Tenant } from "@/lib/tenants";
import { cn } from "@/lib/cn";

interface PrefLogoProps {
  tenant: Tenant;
  size?: number;
  withName?: boolean;
  className?: string;
}

/**
 * Logo institucional da prefeitura — monograma serifa
 * sobre primária + barra inferior na secundária. Visual
 * "shield-like" sem ser brasão (que viraria genérico de portal).
 */
export function PrefLogo({
  tenant,
  size = 32,
  withName = true,
  className,
}: PrefLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        className="flex items-center justify-center overflow-hidden rounded-md font-bold tracking-tight"
        style={{
          width: size,
          height: size,
          background: tenant.primary,
          color: tenant.primaryFg,
          fontSize: size * 0.36,
          fontFamily: "var(--font-serif)",
          boxShadow: `inset 0 -2px 0 ${tenant.secondary}`,
        }}
      >
        {tenant.monogram}
      </div>
      {withName && (
        <div className="leading-tight">
          <div className="text-text text-[12.5px] font-semibold">
            {tenant.short}
          </div>
          <div
            className="text-text-faint text-[10.5px] tracking-wide"
            style={{ letterSpacing: "0.02em" }}
          >
            Educação Municipal
          </div>
        </div>
      )}
    </div>
  );
}
