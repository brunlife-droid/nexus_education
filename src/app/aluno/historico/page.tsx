import { Search } from "lucide-react";
import { Chip } from "@/components/ui";
import { PhoneFrame, PhoneStage, StatusBar } from "@/components/phone";
import { getCurrentTenant } from "@/lib/tenants/server";

const GROUPS = [
  {
    title: "Hoje",
    items: [
      { area: "Matemática", tema: "Frações de uma pizza", hora: "15:32", msgs: 14 },
    ],
  },
  {
    title: "Ontem",
    items: [
      { area: "Língua Portuguesa", tema: "Coesão referencial em redação", hora: "19:08", msgs: 22 },
      { area: "Ciências", tema: "Diferença entre célula animal e vegetal", hora: "14:51", msgs: 8 },
    ],
  },
  {
    title: "Esta semana",
    items: [
      { area: "História", tema: "Brasil Império — Dom Pedro II", hora: "Seg, 09:14", msgs: 17 },
      { area: "Matemática", tema: "Equação do 1º grau — questão da prova", hora: "Dom, 20:40", msgs: 31 },
      { area: "Geografia", tema: "Climas do Brasil — clima tropical", hora: "Sáb, 17:22", msgs: 11 },
    ],
  },
];

const FILTERS = ["Tudo", "Matemática", "Português", "Ciências", "História", "Geografia"];

export default async function HistoricoPage() {
  const tenant = await getCurrentTenant();
  return (
    <PhoneStage
      label={`A3 · Histórico de conversas · ${tenant.short}`}
      description="Agrupado por dia + filtro por disciplina. Busca semântica em todo histórico."
    >
      <PhoneFrame label="Lista com filtros">
        <StatusBar />
        <div className="px-5 pt-1 pb-3">
          <div className="text-[22px] font-semibold tracking-tight">Conversas</div>
          <div className="relative mt-3">
            <Search
              size={14}
              className="text-text-faint absolute top-1/2 left-3 -translate-y-1/2"
            />
            <input
              placeholder="Buscar tema, palavra…"
              className="bg-surface border-border-strong placeholder:text-text-faint h-[38px] w-full rounded-xl border pr-3 pl-9 text-sm outline-none"
            />
          </div>
          <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f, i) => (
              <Chip
                key={f}
                className={
                  i === 0
                    ? "border-transparent whitespace-nowrap text-xs"
                    : "bg-surface text-text-muted whitespace-nowrap text-xs"
                }
                style={
                  i === 0
                    ? { background: tenant.primarySoft, color: tenant.primary }
                    : undefined
                }
              >
                {f}
              </Chip>
            ))}
          </div>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-text-faint px-5 pt-2 pb-1 text-[11.5px] font-semibold tracking-widest uppercase">
                {g.title}
              </div>
              {g.items.map((it, i) => (
                <div
                  key={i}
                  className="border-border flex gap-3 border-b px-5 py-3"
                >
                  <div
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: tenant.primary }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-muted text-[11px]">{it.area}</span>
                      <span className="text-text-faint text-[11px]">
                        {it.hora}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-sm">{it.tema}</div>
                    <div className="text-text-faint mt-0.5 text-[11.5px]">
                      {it.msgs} mensagens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PhoneFrame>
    </PhoneStage>
  );
}
