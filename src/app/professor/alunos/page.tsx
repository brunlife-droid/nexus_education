import { MessageCircle, Phone } from "lucide-react";
import { Avatar, Badge, Button, Card, ProfBadge } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";
import { ALUNOS_7A, TRILHA } from "@/lib/mocks";

export default function AlunosPage() {
  const aluno = ALUNOS_7A[0];

  return (
    <>
      <PageHeader
        title={aluno.nome}
        subtitle={`${aluno.serie} · ${aluno.escola}`}
        actions={
          <>
            <Button variant="secondary" icon={<MessageCircle size={14} />}>
              Mensagem
            </Button>
            <Button variant="secondary" icon={<Phone size={14} />}>
              Contatar responsável
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          {/* Identidade */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={aluno.nome} size={56} />
              <div className="flex flex-col gap-1">
                <ProfBadge value={aluno.prof} />
                <span className="text-text-muted text-xs">
                  {aluno.acessos} acessos · {aluno.ultimoAcesso}
                </span>
              </div>
            </div>
            <hr className="border-border my-4" />
            <div className="flex flex-col gap-2.5 text-sm">
              <Row k="Idade" v="12 anos" />
              <Row k="Responsável" v="Maria Silva" />
              <Row k="Contato" v="(35) 9XXXX-1234" />
              <Row k="Necessidades" v="—" />
              <Row k="Bolsa Família" v="Sim" />
              <Row k="Modo a11y" v="Padrão" />
            </div>
            <div className="bg-warning-soft text-warning-fg mt-4 rounded-md p-3 text-xs leading-relaxed">
              <b>Histórico SRE:</b> 1 episódio em mar/2026 (encerrado).
              Acolhimento da orientadora.
            </div>
          </Card>

          {/* Trilha + atividade */}
          <div className="flex flex-col gap-5">
            <Card className="p-0">
              <div className="border-border border-b px-6 py-4">
                <div className="text-sm font-semibold">Trilha de aprendizagem</div>
                <div className="text-text-muted mt-0.5 text-xs">
                  Por disciplina · 2º bimestre
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {TRILHA.map((d) => (
                  <div key={d.area} className="bg-surface-2 rounded-md p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.area}</span>
                      <span
                        className="text-text-faint text-[11px]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {d.dominado}/{d.total}
                      </span>
                    </div>
                    <div className="bg-surface-3 mt-2 h-1.5 overflow-hidden rounded">
                      <div
                        className="h-full"
                        style={{
                          width: `${(d.dominado / d.total) * 100}%`,
                          background: d.cor,
                        }}
                      />
                    </div>
                    <div className="text-text-muted mt-2 text-xs">
                      Estudando: <b className="text-text">{d.atual}</b>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0">
              <div className="border-border border-b px-6 py-4">
                <div className="text-sm font-semibold">Últimas atividades</div>
                <div className="text-text-muted mt-0.5 text-xs">
                  IA + atividades em sala
                </div>
              </div>
              <div className="flex flex-col">
                {[
                  { hora: "há 2h", titulo: "Dúvida resolvida · frações de pizza", tipo: "Chat com tutor", tone: "primary" as const },
                  { hora: "ontem 18:42", titulo: "Lista de matemática · 8/10 acertos", tipo: "Atividade", tone: "success" as const },
                  { hora: "ontem 14:10", titulo: "Redação enviada (aguardando devolutiva)", tipo: "Redação", tone: "warning" as const },
                  { hora: "seg, 09:14", titulo: "História · Brasil Império", tipo: "Chat com tutor", tone: "primary" as const },
                ].map((a, i) => (
                  <div
                    key={i}
                    className="border-border flex items-center gap-4 px-6 py-3.5 not-last:border-b"
                  >
                    <span
                      className="text-text-faint w-24 text-xs"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {a.hora}
                    </span>
                    <Badge tone={a.tone}>{a.tipo}</Badge>
                    <span className="flex-1 text-sm">{a.titulo}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{k}</span>
      <span>{v}</span>
    </div>
  );
}
