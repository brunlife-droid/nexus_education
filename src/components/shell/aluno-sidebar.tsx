"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  Layers,
  MessageSquarePlus,
  Megaphone,
  Settings,
} from "lucide-react";
import { PrefLogo } from "@/components/tenant";
import type { Tenant } from "@/lib/tenants";
import { cn } from "@/lib/cn";
import { LogoutButton } from "./logout-button";

export interface AlunoRecentConversation {
  id: string;
  title: string;
  area: string | null;
  updatedLabel: string;
}

interface AlunoSidebarProps {
  tenant: Tenant;
  studentName: string;
  recentConversations: AlunoRecentConversation[];
  unreadAnnouncements: number;
}

const SECTIONS = [
  { id: "trilha", label: "Minha trilha", href: "/aluno/trilha", icon: Layers },
  { id: "estudo", label: "Estudo ativo", href: "/aluno/estudo", icon: Brain },
  { id: "mural", label: "Recados", href: "/aluno/mural", icon: Megaphone },
  { id: "biblioteca", label: "Materiais", href: "/aluno/historico", icon: BookOpen },
];

export function AlunoSidebar({
  tenant,
  studentName,
  recentConversations,
  unreadAnnouncements,
}: AlunoSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-surface-raised border-border flex h-full flex-col overflow-hidden border-r shadow-[var(--shadow-sm)]">
      <div className="border-border/80 bg-surface-tint border-b px-4 py-3.5">
        <PrefLogo tenant={tenant} />
      </div>

      <div className="px-3 pt-3 pb-2">
        <Link
          href="/aluno/chat"
          className="lift-on-hover flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-semibold transition-colors"
          style={{
            background: tenant.primary,
            color: tenant.primaryFg,
            boxShadow: `0 10px 22px color-mix(in srgb, ${tenant.primary} 26%, transparent)`,
          }}
        >
          <MessageSquarePlus size={16} />
          Nova conversa
        </Link>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-3">
        <div className="mt-2">
          <div className="section-label mb-1 px-2">Estudar</div>
          <div className="flex flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = pathname === s.href;
              const badge = s.id === "mural" ? unreadAnnouncements : 0;
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border px-2 py-2 text-[13px] transition-colors",
                    active
                      ? "border-primary-border bg-primary-soft text-primary font-semibold shadow-[var(--shadow-xs)]"
                      : "border-transparent text-text-muted hover:border-primary-border hover:bg-surface-tint hover:text-text",
                  )}
                >
                  <Icon size={14} />
                  <span className="flex-1">{s.label}</span>
                  {badge > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        background: tenant.primary,
                        color: tenant.primaryFg,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-border/80 mt-4 border-t pt-3">
          <div className="section-label mb-1 px-2">Configuração</div>
          <Link
            href="/aluno/acessibilidade"
            className="soft-band flex items-center gap-2.5 rounded-lg p-2 transition-colors"
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
              style={{
                background: tenant.primarySoft,
                color: tenant.primary,
              }}
            >
              {studentName
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium">{studentName}</div>
              <div className="text-text-subtle truncate text-[11px]">
                {tenant.short}
              </div>
            </div>
            <Settings size={14} className="text-text-faint" />
          </Link>
        </div>

        <div className="border-border/80 mt-4 border-t pt-3">
          <div className="section-label mb-1 px-2">Recentes</div>
          <div className="flex flex-col">
            {recentConversations.length === 0 ? (
              <div className="text-text-subtle rounded-md px-2 py-3 text-[12px] leading-relaxed">
                As conversas recentes aparecem aqui depois do primeiro estudo.
              </div>
            ) : (
              recentConversations.map((c, i) => {
                const active = pathname === "/aluno/chat" && i === 0;
                const area = c.area ?? "Conversa";
                return (
                  <Link
                    key={c.id}
                    href={`/aluno/chat?id=${c.id}`}
                    className={cn(
                      "group flex flex-col gap-0.5 rounded-md border px-2 py-2 transition-colors",
                      active
                        ? "border-primary-border bg-primary-soft"
                        : "border-transparent hover:border-primary-border hover:bg-surface-tint",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: areaColor(area) }}
                      />
                      <div className="text-text truncate text-[13px]">
                        {c.title || "Conversa com a tutora"}
                      </div>
                    </div>
                    <div className="text-text-subtle flex items-center gap-1.5 pl-3.5 text-[11px]">
                      <span>{area}</span>
                      <span>-</span>
                      <span>{c.updatedLabel}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="border-border/80 border-t p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}

function areaColor(area: string): string {
  const normalizedArea = area
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedArea === "matematica") return "var(--primary)";
  if (normalizedArea === "portugues") return "var(--accent-rose)";
  if (normalizedArea === "ciencias") return "var(--success)";
  if (normalizedArea === "historia") return "var(--warning)";
  return "var(--accent-sky)";
}
