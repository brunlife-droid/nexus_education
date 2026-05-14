import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";

const SUGGESTIONS = [
  {
    type: "coesao",
    label: "Coesão",
    text: "A repetição de \"as pessoas\" em três frases consecutivas no 2º parágrafo enfraquece o texto. Sugira sinônimos ou pronomes.",
  },
  {
    type: "argumentacao",
    label: "Argumentação",
    text: "O argumento sobre desigualdade está bem trazido, mas falta um dado concreto que sustente. Sugira pesquisa rápida ou exemplo histórico.",
  },
  {
    type: "norma",
    label: "Norma culta",
    text: "Erro recorrente: uso de \"haver\" no plural (\"houveram\"). Marque os 3 casos e indique a regra.",
  },
];

const RUBRICA = [
  { c: "Compreensão da proposta", v: 180, t: 200 },
  { c: "Argumentação", v: 140, t: 200 },
  { c: "Coesão", v: 120, t: 200 },
  { c: "Norma culta", v: 100, t: 200 },
  { c: "Proposta de intervenção", v: 160, t: 200 },
];

export default function CorrecaoPage() {
  return (
    <>
      <PageHeader
        title="Correção assistida · Redação"
        subtitle="João Pedro Silva · 7º A · Redação ENEM-style sobre desigualdade"
        actions={
          <>
            <Button variant="secondary" icon={<ChevronLeft size={14} />}>
              Anterior
            </Button>
            <Button variant="secondary" iconRight={<ChevronRight size={14} />}>
              Próxima (11/12)
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Texto da redação */}
          <Card className="p-0">
            <div className="border-border flex items-center justify-between border-b px-6 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar name="João Pedro Silva" size={32} />
                <div>
                  <div className="text-sm font-semibold">João Pedro Silva</div>
                  <div className="text-text-muted text-xs">
                    Entregue há 3 dias · 1ª versão
                  </div>
                </div>
              </div>
              <Badge tone="warning">aguardando devolutiva</Badge>
            </div>
            <div className="p-6 text-[15px] leading-[1.85]">
              <p>
                A desigualdade social é um dos maiores problemas que a sociedade
                enfrenta. <mark className="bg-danger-soft px-1">As pessoas</mark>{" "}
                que vivem em regiões pobres do Brasil têm muito menos acesso a
                escola, hospital e até mesmo comida.{" "}
                <mark className="bg-danger-soft px-1">As pessoas</mark> ricas,
                por outro lado, conseguem ter tudo isso com facilidade.
              </p>
              <p className="mt-3">
                {" "}
                Isso acontece porque{" "}
                <mark className="bg-warning-soft px-1">houveram</mark> séculos de
                exploração no Brasil, desde a escravidão até hoje em dia. A
                história mostra que <mark className="bg-warning-soft px-1">as
                  pessoas</mark> que estavam no topo nunca quiseram dividir o
                que tinham.
              </p>
              <p className="mt-3">
                Para resolver isso, o governo precisa investir mais em educação
                e saúde nas áreas pobres. Também é importante que a sociedade
                como um todo combata o preconceito. Só assim conseguiremos um
                Brasil mais justo para todos.
              </p>
            </div>
            <div className="border-border bg-surface-2 border-t px-6 py-3.5 text-xs">
              <span
                className="text-text-faint"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                258 palavras · 4 parágrafos · 3 marcações da IA
              </span>
            </div>
          </Card>

          {/* Sugestões da IA + rubrica */}
          <div className="flex flex-col gap-4">
            <Card className="p-0">
              <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles size={14} className="text-primary" />
                    Sugestões da IA
                  </div>
                  <div className="text-text-muted mt-0.5 text-xs">
                    Não envia ao aluno até você aprovar.
                  </div>
                </div>
              </div>
              <div>
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={s.type}
                    className={`p-4 ${
                      i < SUGGESTIONS.length - 1
                        ? "border-border border-b"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="primary">{s.label}</Badge>
                      <div className="flex gap-1">
                        <button className="hover:bg-surface-2 text-text-muted rounded-md p-1">
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-semibold">Rubrica</div>
              <div className="text-text-muted mt-0.5 text-xs">
                Estimativa da IA · você pode ajustar.
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {RUBRICA.map((r) => (
                  <div key={r.c}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{r.c}</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {r.v}/{r.t}
                      </span>
                    </div>
                    <div className="bg-surface-3 mt-1 h-1.5 overflow-hidden rounded">
                      <div
                        className="bg-primary h-full"
                        style={{ width: `${(r.v / r.t) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="border-border mt-2 flex items-center justify-between border-t pt-2.5">
                  <span className="text-sm font-semibold">Total estimado</span>
                  <span
                    className="text-lg font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    700/1000
                  </span>
                </div>
              </div>
              <Button className="mt-4 w-full">Enviar devolutiva</Button>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}
