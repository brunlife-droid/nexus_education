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

interface AlunoSidebarProps {
  tenant: Tenant;
  studentName: string;
}

const RECENT_CONVERSATIONS = [
  { id: "c1", title: "Frações de uma pizza", date: "Hoje", area: "Matemática" },
  { id: "c2", title: "Coesão referencial em redação", date: "Ontem", area: "Português" },
  { id: "c3", title: "Diferença célula animal e vegetal", date: "Ontem", area: "Ciências" },
  { id: "c4", title: "Brasil Império — Dom Pedro II", date: "Seg", area: "História" },
  { id: "c5", title: "Equação do 1º grau — prova", date: "Dom", area: "Matemática" },
  { id: "c6", title: "Climas do Brasil — tropical", date: "Sáb", area: "Geografia" },
];

const SECTIONS = [
  { id: "trilha", label: "Minha trilha", href: "/aluno/trilha", icon: Layers },
  { id: "estudo", label: "Estudo ativo", href: "/aluno/estudo", icon: Brain },
  { id: "mural", label: "Recados", href: "/aluno/mural", icon: Megaphone, badge: 2 },
  { id: "biblioteca", label: "Materiais", href: "/aluno/historico", icon: BookOpen },
];

export function AlunoSidebar({ tenant, studentName }: AlunoSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-surface border-border flex h-full flex-col overflow-hidden border-r">
      {/* Header: logo do tenant */}
      <div className="border-border border-b px-4 py-3.5">
        <PrefLogo tenant={tenant} />
      </div>

      {/* Botão Nova conversa */}
      <div className="px-3 pt-3 pb-2">
        <Link
          href="/aluno/chat"
          className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors"
          style={{
            background: tenant.primary,
            color: tenant.primaryFg,
          }}
        >
          <MessageSquarePlus size={16} />
          Nova conversa
        </Link>
      </div>

      {/* Lista de conversas (scrollable) */}
      <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-3">
        <div className="text-text-faint mt-2 mb-1 px-2 text-[10.5px] font-semibold tracking-widest uppercase">
          Recentes
        </div>
        <div className="flex flex-col">
          {RECENT_CONVERSATIONS.map((c, i) => {
            const isFirst = i === 0;
            return (
              <Link
                key={c.id}
                href="/aluno/chat"
                className={cn(
                  "group flex flex-col gap-0.5 rounded-md px-2 py-2 transition-colors",
                  isFirst
                    ? "bg-surface-2"
                    : "hover:bg-surface-2",
                )}
              >
                <div className="text-[13px] truncate text-text">{c.title}</div>
                <div className="text-text-faint flex items-center gap-1.5 text-[11px]">
                  <span>{c.area}</span>
                  <span>·</span>
                  <span>{c.date}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Outras seções */}
        <div className="border-border mt-4 border-t pt-3">
          <div className="text-text-faint mb-1 px-2 text-[10.5px] font-semibold tracking-widest uppercase">
            Estudar
          </div>
          <div className="flex flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = pathname === s.href;
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]",
                    active
                      ? "bg-primary-soft text-primary font-medium"
                      : "text-text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <Icon size={14} />
                  <span className="flex-1">{s.label}</span>
                  {s.badge && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        background: tenant.primary,
                        color: tenant.primaryFg,
                      }}
                    >
                      {s.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* User profile no rodapé */}
      <div className="border-border border-t p-3">
        <div className="space-y-1">
          <Link
            href="/aluno/acessibilidade"
            className="hover:bg-surface-2 flex items-center gap-2.5 rounded-md p-2 transition-colors"
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
              <div className="text-text-faint truncate text-[11px]">
                7º A · {tenant.short}
              </div>
            </div>
            <Settings size={14} className="text-text-faint" />
          </Link>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
