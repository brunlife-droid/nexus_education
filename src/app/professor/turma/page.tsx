import Link from "next/link";
import { ArrowRight, Filter } from "lucide-react";
import { Button, Card, ProfBadge } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";
import { ALUNOS_7A, buildHeatmap } from "@/lib/mocks";

const KPIS = [
  { label: "Alunos", value: "28", sub: "matrículas ativas" },
  { label: "Engajados", value: "22", sub: "≥3 acessos / semana" },
  { label: "Em risco", value: "2", sub: "Gabriel · Davi" },
  { label: "Proficiência média", value: "Adequada", sub: "subiu 1 nível" },
];

function heatColor(score: number) {
  if (score >= 0.85) return "var(--prof-advanced)";
  if (score >= 0.7) return "var(--prof-adequate)";
  if (score >= 0.5) return "var(--prof-basic)";
  return "var(--prof-insufficient)";
}

export default function TurmaPage() {
  const { habs, data } = buildHeatmap();

  return (
    <>
      <PageHeader
        title="7º A · Matemática"
        subtitle="EM Dr. Sebastião Gualberto · 28 alunos · 2º bimestre"
        actions={
          <>
            <Button variant="secondary" icon={<Filter size={14} />}>
              Filtros
            </Button>
            <Button>Mensagem para a turma</Button>
          </>
        }
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPIS.map((k) => (
            <Card key={k.label} className="p-4">
              <div className="text-text-faint text-[11.5px] font-medium tracking-wider uppercase">
                {k.label}
              </div>
              <div className="mt-1.5 text-[26px] leading-none font-semibold tracking-tight">
                {k.value}
              </div>
              <div className="text-text-muted mt-1 text-xs">{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* Heatmap habilidade × aluno */}
        <Card className="p-0">
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <div>
              <div className="text-sm font-semibold">
                Heatmap · habilidade × aluno
              </div>
              <div className="text-text-muted mt-0.5 text-xs">
                Verde = avançado · vermelho = insuficiente · clique para drill
              </div>
            </div>
            <div className="text-text-faint flex items-center gap-4 text-[11px]">
              {[
                { l: "Avançado", c: "var(--prof-advanced)" },
                { l: "Adequado", c: "var(--prof-adequate)" },
                { l: "Básico", c: "var(--prof-basic)" },
                { l: "Insuficiente", c: "var(--prof-insufficient)" },
              ].map((l) => (
                <span key={l.l} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ background: l.c }}
                  />
                  {l.l}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            <table
              className="border-separate border-spacing-1 text-xs"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <thead>
                <tr>
                  <th className="text-text-faint w-12 pr-2 text-left text-[10px]">
                    Aluno
                  </th>
                  {habs.map((h) => (
                    <th
                      key={h}
                      className="text-text-faint min-w-[64px] px-1 text-center text-[10px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.aluno}>
                    <td className="pr-2 text-[11px]">{row.aluno}</td>
                    {row.cells.map((c) => (
                      <td key={c.hab}>
                        <div
                          className="h-8 rounded text-[10px] text-white grid place-items-center"
                          style={{ background: heatColor(c.score) }}
                          title={`${row.nome} · ${c.hab} · ${(c.score * 100).toFixed(0)}%`}
                        >
                          {(c.score * 100).toFixed(0)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Lista de alunos */}
        <Card className="p-0">
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <div className="text-sm font-semibold">Lista de alunos</div>
            <div className="text-text-muted text-xs">Ordenado por proficiência</div>
          </div>
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {["Aluno", "Proficiência", "Acessos", "Último acesso", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="bg-surface-2 text-text-faint border-border border-b px-4 py-2 text-left text-[11px] font-medium tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {ALUNOS_7A.map((al) => (
                <tr key={al.id} className="hover:bg-surface-2">
                  <td className="border-border h-11 border-b px-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-soft text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                        {al.foto}
                      </div>
                      <span>{al.nome}</span>
                    </div>
                  </td>
                  <td className="border-border h-11 border-b px-4 align-middle">
                    <ProfBadge value={al.prof} />
                  </td>
                  <td
                    className="border-border h-11 border-b px-4 align-middle text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {al.acessos}
                  </td>
                  <td className="border-border text-text-muted h-11 border-b px-4 align-middle text-xs">
                    {al.ultimoAcesso}
                  </td>
                  <td className="border-border h-11 border-b px-4 align-middle">
                    <Link href="/professor/alunos">
                      <Button variant="ghost" size="sm">
                        Perfil
                        <ArrowRight size={12} />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </PageBody>
    </>
  );
}
