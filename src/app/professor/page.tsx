import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Plus,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Badge, Button, Card, ProfBadge } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";
import { ALERTAS_PROF, ALUNOS_7A } from "@/lib/mocks";

const KPIS = [
  { label: "Alunos engajados", value: "22 / 28", sub: "esta semana" },
  { label: "Redações pendentes", value: "12", sub: "há 3 dias paradas" },
  { label: "Alunos em risco", value: "2", sub: "Gabriel, Davi" },
  { label: "Próximas aulas", value: "3", sub: "hoje" },
];

const SHORTCUTS = [
  {
    title: "Novo plano de aula",
    desc: "IA gera em ~90s. Você revisa e ajusta.",
    href: "/professor/copiloto",
    icon: Sparkles,
  },
  {
    title: "Corrigir redações",
    desc: "12 redações do 7º A aguardando.",
    href: "/professor/correcao",
    icon: AlertTriangle,
  },
  {
    title: "Gerar prova",
    desc: "Multi-versão com gabarito.",
    href: "/professor/provas",
    icon: Plus,
  },
];

export default function ProfessorDashboard() {
  const topProf = ALUNOS_7A.filter((a) => a.prof === "avancada").slice(0, 3);

  return (
    <>
      <PageHeader
        title="Olá, Ricardo."
        subtitle="Matemática · 7º A, 7º B, 8º A · 2º bimestre"
        actions={
          <>
            <Button variant="secondary">Hoje</Button>
            <Button icon={<Plus size={14} />}>Nova ação</Button>
          </>
        }
      />
      <PageBody>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPIS.map((k) => (
            <Card key={k.label} className="p-4">
              <div className="text-text-faint text-[11.5px] font-medium tracking-wider uppercase">
                {k.label}
              </div>
              <div className="mt-1.5 text-[28px] leading-none font-semibold tracking-tight">
                {k.value}
              </div>
              <div className="text-text-muted mt-1 text-xs">{k.sub}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Shortcuts */}
          <div className="flex flex-col gap-3">
            <div className="text-text-faint text-[11.5px] font-semibold tracking-wider uppercase">
              Atalhos pedagógicos
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {SHORTCUTS.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.href} href={s.href}>
                    <Card className="hover:border-border-strong h-full p-4 transition-colors">
                      <div className="bg-primary-soft text-primary inline-flex rounded-md p-2">
                        <Icon size={16} />
                      </div>
                      <div className="mt-3 text-sm font-semibold">{s.title}</div>
                      <div className="text-text-muted mt-1 text-xs leading-relaxed">
                        {s.desc}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Alertas */}
            <div className="mt-2">
              <div className="text-text-faint text-[11.5px] font-semibold tracking-wider uppercase">
                Alertas pedagógicos
              </div>
              <Card className="mt-2 p-0">
                {ALERTAS_PROF.map((a, i) => {
                  const tone =
                    a.tipo === "risco"
                      ? "danger"
                      : a.tipo === "pendencia"
                        ? "warning"
                        : "success";
                  const Icon =
                    a.tipo === "risco"
                      ? AlertTriangle
                      : a.tipo === "pendencia"
                        ? AlertTriangle
                        : Trophy;
                  return (
                    <div
                      key={i}
                      className="border-border flex items-start gap-3 p-4 not-last:border-b"
                    >
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-md ${
                          tone === "danger"
                            ? "bg-danger-soft text-danger"
                            : tone === "warning"
                              ? "bg-warning-soft text-warning"
                              : "bg-success-soft text-success-fg"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{a.aluno}</span>
                          <Badge
                            tone={
                              a.urgencia === "alta"
                                ? "danger"
                                : a.urgencia === "media"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {a.urgencia}
                          </Badge>
                        </div>
                        <div className="text-text-muted mt-1 text-xs">
                          {a.motivo}
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-text-faint mt-2 shrink-0"
                      />
                    </div>
                  );
                })}
              </Card>
            </div>
          </div>

          {/* Sidebar: destaques de turma */}
          <div className="flex flex-col gap-3">
            <div className="text-text-faint text-[11.5px] font-semibold tracking-wider uppercase">
              Destaques da turma
            </div>
            <Card className="p-4">
              <div className="text-sm font-semibold">7º A · Mat.</div>
              <div className="text-text-muted mt-0.5 text-xs">
                28 alunos · proficiência média adequada
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {topProf.map((al) => (
                  <div
                    key={al.id}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <div className="bg-primary-soft text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                      {al.foto}
                    </div>
                    <span className="flex-1 truncate">{al.nome}</span>
                    <ProfBadge value={al.prof} />
                  </div>
                ))}
              </div>
              <Link href="/professor/turma">
                <Button variant="ghost" size="sm" className="mt-3 w-full">
                  Ver toda a turma
                  <ArrowRight size={12} />
                </Button>
              </Link>
            </Card>

            <Card className="bg-primary-soft border-primary-border p-4">
              <div className="text-primary text-[11.5px] font-semibold tracking-wider uppercase">
                Fase 0
              </div>
              <p className="text-primary mt-1 text-sm leading-relaxed">
                Dashboard P1 — dados mockados. As funcionalidades de geração
                de plano (P2), correção (P3) e geração de prova (P4) ainda são
                placeholders. A integração real com IA vem após conectarmos
                Anthropic + Neon.
              </p>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
