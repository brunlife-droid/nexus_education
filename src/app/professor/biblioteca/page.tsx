import { Eye, Heart, Search, Upload } from "lucide-react";
import { Badge, Button, Card, Chip } from "@/components/ui";
import { PageHeader, PageBody } from "@/components/layout";

const PLANOS = [
  {
    titulo: "Frações equivalentes com material concreto",
    autor: "Ricardo Marques",
    escola: "EM Dr. Sebastião Gualberto",
    disciplina: "Matemática",
    serie: "7º",
    likes: 47,
    views: 192,
    tags: ["EF07MA04", "pizza", "manipulativo"],
  },
  {
    titulo: "Texto argumentativo: redação ENEM-style",
    autor: "Patrícia Vilela",
    escola: "EM Hélio Bagatini",
    disciplina: "Língua Portuguesa",
    serie: "9º",
    likes: 38,
    views: 154,
    tags: ["EF09LP08", "redação", "argumentação"],
  },
  {
    titulo: "Brasil Império em 5 atos",
    autor: "Carlos Almeida",
    escola: "EM Padre Vitor Coelho",
    disciplina: "História",
    serie: "8º",
    likes: 29,
    views: 98,
    tags: ["EF08HI09", "teatro", "interdisciplinar"],
  },
  {
    titulo: "Ecossistemas locais — saída de campo",
    autor: "Joana Ferreira",
    escola: "EM Prof. José Marques",
    disciplina: "Ciências",
    serie: "7º",
    likes: 52,
    views: 211,
    tags: ["EF07CI07", "campo", "ambiental"],
  },
  {
    titulo: "Equações do 1º grau com manipulativos",
    autor: "Ricardo Marques",
    escola: "EM Dr. Sebastião Gualberto",
    disciplina: "Matemática",
    serie: "7º",
    likes: 24,
    views: 86,
    tags: ["EF07MA13", "balança", "manipulativo"],
  },
  {
    titulo: "Coesão referencial — pronomes",
    autor: "Patrícia Vilela",
    escola: "EM Hélio Bagatini",
    disciplina: "Língua Portuguesa",
    serie: "7º",
    likes: 19,
    views: 64,
    tags: ["EF07LP12", "coesão"],
  },
];

export default function BibliotecaPage() {
  return (
    <>
      <PageHeader
        title="Biblioteca da rede"
        subtitle="Planos compartilhados por professores das 8 prefeituras · 612 planos publicados"
        actions={
          <>
            <Button variant="secondary" icon={<Upload size={14} />}>
              Publicar
            </Button>
            <Button>Buscar com IA</Button>
          </>
        }
      />
      <PageBody>
        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Search
                size={14}
                className="text-text-faint absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                className="bg-surface border-border-strong placeholder:text-text-faint h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none"
                placeholder="Tema, habilidade BNCC, autor…"
              />
            </div>
            {["Disciplina: Tudo", "Série: 7º", "Mais curtidos", "Da minha escola"].map(
              (f) => (
                <Chip key={f}>{f}</Chip>
              ),
            )}
          </div>
        </Card>

        {/* Grid de planos */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANOS.map((p) => (
            <Card key={p.titulo} className="p-5 hover:border-border-strong transition-colors">
              <div className="flex items-center justify-between">
                <Badge tone="primary">{p.disciplina}</Badge>
                <span className="text-text-faint text-xs">{p.serie}</span>
              </div>
              <h3 className="mt-3 text-[15px] font-semibold leading-snug">
                {p.titulo}
              </h3>
              <div className="text-text-muted mt-2 text-xs">
                {p.autor} · {p.escola}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <Chip key={t} className="text-[10.5px]">
                    {t}
                  </Chip>
                ))}
              </div>
              <div className="text-text-faint mt-4 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Heart size={12} />
                  {p.likes}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={12} />
                  {p.views}
                </span>
                <Button variant="ghost" size="sm">
                  Abrir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}
