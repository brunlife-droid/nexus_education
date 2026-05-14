import { MapPin, Trophy } from "lucide-react";
import { PhoneFrame, PhoneStage, StatusBar } from "@/components/phone";
import { getCurrentTenant } from "@/lib/tenants/server";
import { TRILHA } from "@/lib/mocks";

export default async function TrilhaPage() {
  const tenant = await getCurrentTenant();
  return (
    <PhoneStage
      label={`A4 · Trilha de aprendizagem · ${tenant.short}`}
      description='Mapa do progresso por disciplina. "Você dominou X" sem gamificação infantil.'
    >
      <PhoneFrame label="Visão geral · por disciplina">
        <StatusBar />
        <div className="scroll-thin flex-1 overflow-y-auto px-5 pt-1 pb-5">
          <div className="text-text-faint mt-1 text-[11.5px] tracking-widest uppercase">
            Sua trilha
          </div>
          <div className="text-[22px] font-semibold tracking-tight">
            2º bimestre · 7º A
          </div>

          <div
            className="mt-4 flex items-center gap-3.5 rounded-2xl p-3.5"
            style={{ background: tenant.primary, color: tenant.primaryFg }}
          >
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: tenant.secondary, color: tenant.secondaryFg }}
            >
              62%
            </div>
            <div>
              <div className="text-[13px] opacity-80">Próximo passo</div>
              <div className="mt-0.5 text-[15px] font-semibold">
                Razão e proporção
              </div>
              <div className="mt-1 text-xs opacity-85">
                Matemática · 3 atividades
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {TRILHA.map((d) => (
              <div
                key={d.area}
                className="bg-surface border-border rounded-2xl border p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{d.area}</div>
                  <span
                    className="text-text-faint text-[11px]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {d.dominado}/{d.total}
                  </span>
                </div>
                <div className="bg-surface-3 mt-2.5 h-1.5 overflow-hidden rounded">
                  <div
                    className="h-full"
                    style={{
                      width: `${(d.dominado / d.total) * 100}%`,
                      background: d.cor,
                    }}
                  />
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <MapPin size={12} className="text-text-faint" />
                  <span className="text-text-muted text-xs">
                    Estudando: <b className="text-text">{d.atual}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-success-soft mt-4 flex gap-3 rounded-2xl p-3.5">
            <Trophy size={20} className="text-success-fg mt-0.5 shrink-0" />
            <div>
              <div className="text-success-fg text-[13.5px] font-semibold">
                Você dominou frações!
              </div>
              <div className="text-success-fg/85 mt-0.5 text-[12.5px]">
                14 habilidades de matemática consolidadas. Pode partir pra
                razões.
              </div>
            </div>
          </div>
        </div>
      </PhoneFrame>
    </PhoneStage>
  );
}
