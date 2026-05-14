import { Download, Plus, Sparkles } from "lucide-react";
import { Badge, Button, Card, Chip } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";

const QUESTOES = [
  {
    n: 1,
    tipo: "múltipla escolha",
    hab: "EF07MA04",
    enunciado:
      "Qual das frações abaixo é equivalente a 3/4? (A) 6/8  (B) 5/6  (C) 7/9  (D) 9/16",
    nivel: "fácil",
  },
  {
    n: 2,
    tipo: "discursiva",
    hab: "EF07MA04",
    enunciado:
      "Joana comeu 2/6 de uma pizza e Pedro comeu 4/12 de outra do mesmo tamanho. Quem comeu mais? Justifique usando o conceito de frações equivalentes.",
    nivel: "médio",
  },
  {
    n: 3,
    tipo: "múltipla escolha",
    hab: "EF07MA12",
    enunciado:
      "Em uma turma de 30 alunos, 2/5 são meninas. Quantos meninos há na turma? (A) 12  (B) 18  (C) 15  (D) 20",
    nivel: "médio",
  },
];

export default function ProvasPage() {
  return (
    <>
      <PageHeader
        title="Gerador de prova"
        subtitle="Multi-versão (A/B), gabarito, distribuição por nível e habilidade BNCC."
        actions={
          <>
            <Button variant="secondary" icon={<Download size={14} />}>
              Exportar PDF
            </Button>
            <Button icon={<Sparkles size={14} />}>Gerar nova versão</Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          {/* Config */}
          <Card className="p-5">
            <div className="text-sm font-semibold">Configuração</div>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Row label="Disciplina" value="Matemática" />
              <Row label="Série" value="7º A" />
              <Row label="Habilidades" value="EF07MA04 · EF07MA12" />
              <Row label="Total de questões" value="10" />
              <Row label="Versões" value="A · B · C" />
              <Row label="Tempo previsto" value="50 min" />
            </div>
            <div className="border-border mt-4 border-t pt-4">
              <div className="text-text-faint text-[11.5px] tracking-wider uppercase">
                Distribuição por nível
              </div>
              <div className="mt-2 flex flex-col gap-1.5 text-xs">
                {[
                  { l: "Fácil", n: 3 },
                  { l: "Médio", n: 5 },
                  { l: "Difícil", n: 2 },
                ].map((d) => (
                  <div key={d.l} className="flex items-center gap-2">
                    <span className="w-12">{d.l}</span>
                    <div className="bg-surface-3 h-1.5 flex-1 overflow-hidden rounded">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${(d.n / 10) * 100}%` }}
                      />
                    </div>
                    <span
                      className="w-4 text-right"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {d.n}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-0">
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <div>
                <div className="text-sm font-semibold">Versão A · pré-visualização</div>
                <div className="text-text-muted mt-0.5 text-xs">
                  10 questões · gabarito gerado · 3 versões prontas
                </div>
              </div>
              <Badge tone="primary">
                <Sparkles size={10} />
                gerado por IA
              </Badge>
            </div>
            <div className="flex flex-col gap-5 p-6">
              {QUESTOES.map((q) => (
                <div key={q.n} className="border-border border-b pb-5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-text-faint text-sm font-semibold"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {q.n.toString().padStart(2, "0")}.
                    </span>
                    <Chip className="text-[10.5px]">{q.tipo}</Chip>
                    <Chip className="text-[10.5px]">
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {q.hab}
                      </span>
                    </Chip>
                    <Badge
                      tone={
                        q.nivel === "fácil"
                          ? "success"
                          : q.nivel === "médio"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {q.nivel}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-relaxed">
                    {q.enunciado}
                  </p>
                </div>
              ))}

              <div className="text-text-faint text-center text-xs">
                + 7 questões geradas — abrir PDF para ver tudo
              </div>

              <Button variant="ghost" icon={<Plus size={14} />}>
                Adicionar questão manualmente
              </Button>
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
