import { Calendar, Plus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";

const ENTRIES = [
  {
    data: "Hoje · 12/05",
    aulas: [
      {
        turma: "7º A",
        disciplina: "Matemática",
        tema: "Frações equivalentes",
        obs: "Turma engajada com material concreto. Davi participou pela 1ª vez na semana.",
        habilidades: ["EF07MA04"],
      },
      {
        turma: "7º B",
        disciplina: "Matemática",
        tema: "Operações com decimais",
        obs: "Dificuldade na divisão. Repassar conceito na próxima aula.",
        habilidades: ["EF07MA09"],
      },
    ],
  },
  {
    data: "Ontem · 11/05",
    aulas: [
      {
        turma: "8º A",
        disciplina: "Matemática",
        tema: "Equações do 1º grau",
        obs: "Aplicada lista de exercícios. Média da turma: 7,2.",
        habilidades: ["EF08MA08"],
      },
    ],
  },
  {
    data: "Seg · 09/05",
    aulas: [
      {
        turma: "7º A",
        disciplina: "Matemática",
        tema: "Introdução a frações",
        obs: "Diagnóstico inicial. 5 alunos com defasagem em 4ª operação. Plano de reforço criado.",
        habilidades: ["EF07MA01"],
      },
    ],
  },
];

export default function DiarioPage() {
  return (
    <>
      <PageHeader
        title="Diário pedagógico"
        subtitle="Registro de aulas, observações e habilidades trabalhadas · gerado pela IA, revisado por você"
        actions={
          <>
            <Button variant="secondary" icon={<Calendar size={14} />}>
              Esta semana
            </Button>
            <Button icon={<Plus size={14} />}>Nova entrada</Button>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-6">
          {ENTRIES.map((entry) => (
            <div key={entry.data}>
              <div className="text-text-faint mb-3 text-[11.5px] font-semibold tracking-widest uppercase">
                {entry.data}
              </div>
              <div className="flex flex-col gap-3">
                {entry.aulas.map((a, i) => (
                  <Card key={i} className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="primary">{a.turma}</Badge>
                        <span className="text-text-muted text-xs">
                          {a.disciplina}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {a.habilidades.map((h) => (
                          <span
                            key={h}
                            className="bg-surface-2 text-text-muted rounded px-1.5 py-0.5 text-[10.5px]"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">{a.tema}</h3>
                    <p className="text-text-muted mt-1.5 text-[13px] leading-relaxed">
                      {a.obs}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Card className="bg-primary-soft border-primary-border p-4">
          <div className="text-primary text-[11.5px] font-semibold tracking-wider uppercase">
            Fase 0
          </div>
          <p className="text-primary mt-1 text-sm leading-relaxed">
            O diário será preenchido automaticamente pela IA a partir das
            interações dos alunos com a tutora — você só revisa e ajusta. Por
            enquanto, dados mockados.
          </p>
        </Card>
      </PageBody>
    </>
  );
}
