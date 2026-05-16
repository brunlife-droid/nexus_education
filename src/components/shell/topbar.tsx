"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Search } from "lucide-react";
import { Avatar } from "@/components/ui";
import { LAYERS, type LayerKey } from "./nav";

interface TopbarProps {
  layer: LayerKey;
  userName?: string;
}

export function Topbar({ layer, userName }: TopbarProps) {
  const pathname = usePathname();
  const config = LAYERS[layer];
  const screen = config.groups
    .flatMap((g) => g.items)
    .find((item) => item.href === pathname);
  const screenLabel = screen?.label ?? "Visão geral";

  return (
    <div className="bg-surface border-border flex h-14 shrink-0 items-center gap-4 border-b px-6">
      {/* Breadcrumb */}
      <div className="text-text-muted flex items-center gap-2 text-[13px]">
        <span>{config.label}</span>
        <ChevronRight size={14} className="opacity-60" />
        <span className="text-text font-medium">{screenLabel}</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-[280px]">
        <Search
          size={14}
          className="text-text-faint absolute top-1/2 left-2.5 -translate-y-1/2"
        />
        <input
          placeholder="Buscar alunos, escolas, ações…"
          className="bg-surface border-border-strong placeholder:text-text-faint focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] h-8 w-full rounded-md border pr-12 pl-8 text-[13px] outline-none"
        />
        <span
          className="border-border-strong text-text-muted absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center rounded border-b-2 bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          ⌘K
        </span>
      </div>

      {/* Notifications */}
      <button
        type="button"
        aria-label="Notificações"
        className="text-text-muted hover:bg-surface-2 relative rounded-md p-1.5"
      >
        <Bell size={16} />
        <span className="bg-danger absolute top-1 right-1.5 size-1.5 rounded-full" />
      </button>

      {/* User avatar */}
      <Avatar name={userName ?? config.user?.name ?? "Nexus"} size={30} />
    </div>
  );
}
