"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui";
import { PrefLogo } from "@/components/tenant";
import type { Tenant } from "@/lib/tenants";
import { cn } from "@/lib/cn";
import { NexusMark } from "./nexus-mark";
import { LAYERS, type LayerConfig, type LayerKey } from "./nav";

interface SidebarProps {
  layer: LayerKey;
  tenant: Tenant;
}

export function Sidebar({ layer, tenant }: SidebarProps) {
  const config = LAYERS[layer];
  const pathname = usePathname();
  const isAdmin = layer === "admin";

  return (
    <aside className="bg-surface border-border flex h-full flex-col overflow-hidden border-r">
      {/* Header */}
      <div className="border-border flex items-center gap-2.5 border-b px-3.5 py-3.5">
        {isAdmin ? (
          <>
            <NexusMark size={28} />
            <div className="leading-tight">
              <div className="text-[13px] font-semibold">Nexus Admin</div>
              <div className="text-text-faint text-[10.5px]">
                Console interno
              </div>
            </div>
          </>
        ) : (
          <PrefLogo tenant={tenant} />
        )}
      </div>

      {/* Scrollable nav */}
      <div className="scroll-thin flex-1 overflow-y-auto px-2 py-2 pb-4">
        {/* Layer switcher */}
        <div className="px-3 pt-2.5 pb-1">
          <div className="text-text-faint text-[10.5px] font-semibold tracking-widest uppercase">
            Camada
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(Object.values(LAYERS) as LayerConfig[]).map((l) => {
              const active = l.key === layer;
              const target = l.groups[0]?.items[0]?.href ?? "/";
              return (
                <Link
                  key={l.key}
                  href={target}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11.5px] transition-colors",
                    active
                      ? "bg-primary border-primary text-primary-fg"
                      : "bg-surface-2 border-border text-text-muted hover:bg-surface-3 hover:text-text",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* User card */}
        {config.user && (
          <div className="bg-surface-2 mx-3 mt-3 flex items-center gap-2.5 rounded-md p-2.5">
            <Avatar name={config.user.name} size={32} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[12.5px] font-medium">
                {config.user.name}
              </div>
              <div className="text-text-faint truncate text-[10.5px]">
                {config.user.role}
              </div>
            </div>
          </div>
        )}

        {/* Nav groups */}
        {config.groups.map((group) => (
          <div key={group.title} className="px-3 pt-3 pb-1">
            <div className="text-text-faint px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-widest uppercase">
              {group.title}
            </div>
            <ul>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[13px]",
                        active
                          ? "bg-primary-soft text-primary font-medium"
                          : "text-text-muted hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      <span
                        className="text-text-faint min-w-[28px] font-mono text-[10.5px]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {item.id}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-border border-t px-3 py-3">
        <div className="text-text-faint flex justify-between text-[10.5px]">
          <span>Powered by</span>
          <span className="text-text-muted font-semibold">
            nexus<span className="text-primary">.</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
