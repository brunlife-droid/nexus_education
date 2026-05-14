"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ALL_TENANTS, type TenantId } from "@/lib/tenants";
import { cn } from "@/lib/cn";

/**
 * Switcher visual de tenant (canto inferior direito).
 * Disponível em qualquer ambiente para facilitar demos de white-label.
 * Em produção real isso só aparece para usuários admin.
 */
export function TenantSwitcher({ current }: { current: TenantId }) {
  const router = useRouter();
  const params = useSearchParams();

  const handleSwitch = (id: TenantId) => {
    const next = new URLSearchParams(params);
    next.set("tenant", id);
    router.push(`?${next.toString()}`);
    router.refresh();
  };

  return (
    <div
      className="bg-surface border-border fixed right-4 bottom-4 z-50 flex flex-col gap-1.5 rounded-lg border p-2 shadow-[var(--shadow-lg)]"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div
        className="text-text-faint px-2 pt-0.5 text-[10px] font-semibold tracking-widest uppercase"
      >
        Tenant (demo)
      </div>
      <div className="flex flex-col gap-1">
        {ALL_TENANTS.map((t) => {
          const active = t.id === current;
          return (
            <button
              key={t.id}
              onClick={() => handleSwitch(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ background: t.primary }}
              />
              <span className="flex-1">{t.short}</span>
              <span className="text-text-faint text-[10px] uppercase">
                {t.uf}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
