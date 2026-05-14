import { AlertTriangle, Building, School, Users } from "lucide-react";
import { Badge, Chip } from "@/components/ui";
import { PhoneFrame, PhoneStage, StatusBar } from "@/components/phone";
import { getCurrentTenant } from "@/lib/tenants/server";
import { COMUNICADOS } from "@/lib/mocks";

const FILTERS = ["Tudo", "Secretaria", "Escola", "Turma"];

export default async function MuralPage() {
  const tenant = await getCurrentTenant();
  return (
    <PhoneStage
      label={`A5 · Mural de recados · ${tenant.short}`}
      description="Comunicados da secretaria, escola e turma. Filtro por origem. Confirmação de leitura."
    >
      <PhoneFrame label="Lista de comunicados">
        <StatusBar />
        <div className="border-border border-b px-5 pt-1 pb-2">
          <div className="flex items-center justify-between">
            <div className="text-[22px] font-semibold tracking-tight">
              Recados
            </div>
            <Badge tone="primary">2 novos</Badge>
          </div>
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f, i) => (
              <Chip
                key={f}
                className={
                  i === 0
                    ? "border-transparent whitespace-nowrap"
                    : "bg-surface text-text-muted whitespace-nowrap"
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
          {COMUNICADOS.map((c) => {
            const Icon =
              c.origem === "Secretaria"
                ? Building
                : c.origem === "Escola"
                  ? School
                  : Users;
            const iconBg =
              c.origem === "Secretaria"
                ? { bg: "var(--secondary-soft)", fg: "var(--warning-fg)" }
                : c.origem === "Escola"
                  ? { bg: tenant.primarySoft, fg: tenant.primary }
                  : { bg: "var(--success-soft)", fg: "var(--success-fg)" };

            return (
              <div
                key={c.id}
                className="border-border flex gap-3 border-b px-5 py-3.5"
                style={{
                  background: !c.lido ? tenant.primarySoft + "55" : undefined,
                }}
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: iconBg.bg, color: iconBg.fg }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text-muted text-[11px]">
                      {c.origem} · {c.autor}
                    </span>
                    <span className="text-text-faint text-[11px]">
                      {c.data}
                    </span>
                  </div>
                  <div
                    className={`mt-0.5 text-sm ${
                      !c.lido ? "font-semibold" : ""
                    }`}
                  >
                    {c.titulo}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {c.prioridade === "alta" && (
                      <Chip
                        className="bg-danger-soft text-danger-fg border-transparent text-[10.5px]"
                      >
                        <AlertTriangle size={10} />
                        Importante
                      </Chip>
                    )}
                    {!c.lido && (
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: tenant.primary }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PhoneFrame>
    </PhoneStage>
  );
}
