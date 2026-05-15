import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { Chip } from "@/components/ui";
import { getCurrentTenant } from "@/lib/tenants/server";
import { requireRole } from "@/lib/auth/session";
import { resolveStudentId } from "@/lib/db/student-resolver";
import { listConversations, type ConversationSummary } from "@/lib/chat/persistence";

const FILTERS = ["Tudo", "Matemática", "Português", "Ciências", "História", "Geografia"];

interface BucketItem {
  id: string;
  area: string;
  tema: string;
  hora: string;
}

interface Bucket {
  title: string;
  items: BucketItem[];
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function bucketLabel(updatedAt: Date, today: Date): string {
  const day = startOfDay(updatedAt);
  const todayStart = startOfDay(today);
  const diffDays = Math.floor(
    (todayStart.getTime() - day.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return "Esta semana";
  if (diffDays < 30) return "Este mês";
  return "Anteriores";
}

function formatHora(updatedAt: Date, today: Date): string {
  const day = startOfDay(updatedAt);
  const todayStart = startOfDay(today);
  const diffDays = Math.floor(
    (todayStart.getTime() - day.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 1) {
    return updatedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return updatedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

const BUCKET_ORDER = ["Hoje", "Ontem", "Esta semana", "Este mês", "Anteriores"];

function groupConversations(rows: ConversationSummary[]): Bucket[] {
  const today = new Date();
  const groups = new Map<string, BucketItem[]>();
  for (const row of rows) {
    const label = bucketLabel(row.updatedAt, today);
    const list = groups.get(label) ?? [];
    list.push({
      id: row.id,
      area: row.area ?? "Conversa",
      tema: row.title ?? "(sem título)",
      hora: formatHora(row.updatedAt, today),
    });
    groups.set(label, list);
  }
  return BUCKET_ORDER.filter((label) => groups.has(label)).map((label) => ({
    title: label,
    items: groups.get(label)!,
  }));
}

export default async function HistoricoPage() {
  const user = await requireRole("aluno", "responsavel");
  const tenant = await getCurrentTenant();
  const studentId = await resolveStudentId({
    userId: user.id,
    tenantId: tenant.id,
  });
  const rows = studentId
    ? await listConversations({ tenantId: tenant.id, studentId })
    : [];
  const buckets = groupConversations(rows);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 py-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Materiais</h1>
          <p className="text-text-muted mt-2 text-[15px]">
            Todas as conversas que você teve com a {tenant.tutorName}. Busque
            por tema ou navegue por disciplina.
          </p>
        </header>

        <div className="relative mt-6">
          <Search
            size={16}
            className="text-text-faint absolute top-1/2 left-4 -translate-y-1/2"
          />
          <input
            className="bg-surface border-border-strong placeholder:text-text-faint focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] h-12 w-full rounded-xl border pr-4 pl-11 text-[15px] outline-none transition-all"
            placeholder="Buscar tema, palavra-chave…"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <Chip
              key={f}
              className="cursor-pointer"
              style={
                i === 0
                  ? {
                      background: tenant.primarySoft,
                      color: tenant.primary,
                      borderColor: "transparent",
                    }
                  : undefined
              }
            >
              {f}
            </Chip>
          ))}
        </div>

        {buckets.length === 0 ? (
          <EmptyState tenantPrimary={tenant.primary} tenantSoft={tenant.primarySoft} />
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {buckets.map((g) => (
              <section key={g.title}>
                <div className="text-text-faint text-[11.5px] font-semibold tracking-widest uppercase">
                  {g.title}
                </div>
                <div className="mt-3 flex flex-col">
                  {g.items.map((it) => (
                    <Link
                      key={it.id}
                      href={`/aluno/chat?id=${it.id}`}
                      className="hover:bg-surface-2 border-border group flex items-start gap-4 border-b py-4 transition-colors"
                    >
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: tenant.primarySoft,
                          color: tenant.primary,
                        }}
                      >
                        <MessageSquare size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-text-muted text-xs">{it.area}</span>
                          <span className="text-text-faint text-xs">{it.hora}</span>
                        </div>
                        <div className="text-text mt-1 text-[15px]">{it.tema}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  tenantPrimary,
  tenantSoft,
}: {
  tenantPrimary: string;
  tenantSoft: string;
}) {
  return (
    <div className="border-border mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-xl"
        style={{ background: tenantSoft, color: tenantPrimary }}
      >
        <MessageSquare size={20} />
      </div>
      <div className="text-text mt-1 text-[15px] font-medium">
        Você ainda não conversou com a sua tutora
      </div>
      <p className="text-text-muted max-w-sm text-[13.5px]">
        Quando você começar a tirar dúvida pelo chat, suas conversas aparecem
        aqui — agrupadas por dia.
      </p>
      <Link
        href="/aluno/chat"
        className="mt-2 rounded-lg px-4 py-2 text-[13.5px] font-medium transition-opacity hover:opacity-90"
        style={{ background: tenantPrimary, color: "white" }}
      >
        Começar a estudar
      </Link>
    </div>
  );
}
