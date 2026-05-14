import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Badge, Button, Card, Chip } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";

const FIELDS = [
  { label: "Disciplina", value: "Matemática" },
  { label: "Série", value: "7º ano" },
  { label: "Tema", value: "Frações equivalentes" },
  { label: "Duração", value: "50 min" },
];

const PLAN_SECTIONS = [
  {
    title: "Abertura · 10 min",
    body: "Apresentar pizza dividida em 8 fatias e outra em 4. Pergunta provocadora: \"se você comeu 2/4 ou 4/8, comeu a mesma coisa?\" — coletar hipóteses dos alunos no quadro.",
  },
  {
    title: "Investigação · 25 min",
    body: "Em duplas, alunos recebem material concreto (tiras de papel coloridas representando frações). Devem encontrar pelo menos 3 pares de frações equivalentes e justificar.",
  },
  {
    title: "Sistematização · 10 min",
    body: "Construir coletivamente a regra: \"multiplicando numerador e denominador pelo mesmo número, a fração não muda de valor\". Registrar no caderno.",
  },
  {
    title: "Avaliação formativa · 5 min",
    body: "Ticket de saída: cada aluno escreve 1 fração equivalente a 3/4 antes de sair. Resultado entra no dashboard da turma.",
  },
];

export default function CopilotoPage() {
  return (
    <>
      <PageHeader
        title="Copiloto · Plano de aula"
        subtitle="Tema + série → IA gera em ~90s. Você revisa, ajusta e atribui."
        actions={
          <>
            <Button variant="ghost">Histórico</Button>
            <Button icon={<Sparkles size={14} />}>Gerar novo</Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Form */}
          <Card className="p-5">
            <div className="text-sm font-semibold">Parâmetros</div>
            <div className="text-text-muted mt-1 text-xs">
              Auto-detecção de habilidades BNCC após gerar.
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {FIELDS.map((f) => (
                <div key={f.label}>
                  <div className="text-text-faint text-[11.5px] font-medium tracking-wider uppercase">
                    {f.label}
                  </div>
                  <div className="bg-surface-2 border-border mt-1 rounded-md border px-3 py-2 text-sm">
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-primary-soft text-primary mt-4 flex items-center gap-2 rounded-md p-2.5 text-xs">
              <Sparkles size={12} />
              <span>
                Auto-detectado:{" "}
                <b style={{ fontFamily: "var(--font-mono)" }}>EF07MA04</b>{" "}
                <span className="opacity-70">(94% confiança)</span>
              </span>
            </div>
            <Button className="mt-5 w-full">
              <Sparkles size={14} />
              Regenerar
            </Button>
          </Card>

          {/* Plan preview */}
          <Card className="p-0">
            <div className="border-border flex items-center justify-between border-b px-6 py-4">
              <div>
                <div className="font-serif text-xl font-semibold tracking-tight">
                  Frações equivalentes
                </div>
                <div className="text-text-muted mt-0.5 text-xs">
                  7º ano · 50 min ·{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>EF07MA04</span>
                </div>
              </div>
              <Badge tone="primary">
                <Sparkles size={10} />
                gerado por IA
              </Badge>
            </div>

            <div className="flex flex-col gap-5 p-6">
              {PLAN_SECTIONS.map((s) => (
                <div key={s.title}>
                  <div className="text-text-muted text-[11.5px] font-semibold tracking-wider uppercase">
                    {s.title}
                  </div>
                  <p className="mt-1.5 text-[14px] leading-relaxed">{s.body}</p>
                </div>
              ))}

              <div className="bg-success-soft mt-2 rounded-md p-3.5">
                <div className="text-success-fg text-[11.5px] font-semibold tracking-wider uppercase">
                  Adaptações
                </div>
                <div className="mt-2 flex flex-col gap-2 text-sm">
                  <div>
                    <b>Lucas</b> (dificuldade em frações): pizza maior, cores
                    diferentes em cada fatia.
                  </div>
                  <div>
                    <b>Davi</b> (uso baixo da plataforma): tarefa em dupla com
                    Beatriz para reengajar.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Chip>15 min de preparação</Chip>
                <Chip>Material: tiras de papel coloridas</Chip>
                <Chip>Avaliação formativa incluída</Chip>
              </div>
            </div>

            <div className="border-border flex items-center justify-between border-t px-6 py-3.5">
              <Button variant="secondary" icon={<ChevronLeft size={14} />}>
                Versão anterior
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost">Salvar como rascunho</Button>
                <Button iconRight={<ChevronRight size={14} />}>
                  Atribuir ao 7º A
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
