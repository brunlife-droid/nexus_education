import { ArrowUp, Info, Mic, Moon, X } from "lucide-react";
import { PhoneFrame, PhoneStage, StatusBar } from "@/components/phone";
import { getCurrentTenant } from "@/lib/tenants/server";

const MODES = [
  {
    id: "easy-read",
    icon: "📖",
    title: "Leitura facilitada",
    desc: "Texto maior, espaçamento generoso, frases mais curtas.",
    active: false,
  },
  {
    id: "dyslexia",
    icon: "🔤",
    title: "Modo dislexia",
    desc: "Fonte Atkinson Hyperlegible, mais espaço entre letras e linhas.",
    active: true,
  },
  {
    id: "tdah",
    icon: "🎯",
    title: "Modo TDAH",
    desc: "Sessões em blocos curtos, movimento reduzido, foco em uma tarefa.",
    active: false,
  },
];

const SETTINGS = [
  { label: "Tamanho da fonte", value: "Médio", Icon: ArrowUp },
  { label: "Modo escuro", value: "Automático", Icon: Moon },
  { label: "Voz da tutora", value: "Profe Mari · BR", Icon: Mic },
  { label: "Ler em voz alta automaticamente", value: "Não", Icon: X },
];

export default async function AcessibilidadePage() {
  const tenant = await getCurrentTenant();
  return (
    <PhoneStage
      label={`A6 · Acessibilidade · ${tenant.short}`}
      description="Configurações pessoais do aluno. Persistem entre sessões e dispositivos."
    >
      <PhoneFrame label="Settings de acessibilidade">
        <StatusBar />
        <div className="scroll-thin flex-1 overflow-y-auto px-5 pt-1 pb-6">
          <div className="mt-1 text-[22px] font-semibold tracking-tight">
            Acessibilidade
          </div>
          <div className="text-text-muted mt-1 text-[13px]">
            Você pode mudar a qualquer hora. Eu lembro do seu jeito.
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {MODES.map((m) => (
              <div
                key={m.id}
                className="bg-surface flex gap-3 rounded-2xl border p-3.5"
                style={{
                  borderColor: m.active ? tenant.primary : "var(--border)",
                  boxShadow: m.active
                    ? `0 0 0 3px ${tenant.primarySoft}`
                    : undefined,
                }}
              >
                <div className="text-[26px] shrink-0">{m.icon}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="text-[14.5px] font-medium">{m.title}</div>
                    <div
                      className="relative h-[22px] w-9 shrink-0 rounded-full"
                      style={{
                        background: m.active
                          ? tenant.primary
                          : "var(--border-strong)",
                      }}
                    >
                      <div
                        className="absolute top-0.5 size-[18px] rounded-full bg-white"
                        style={{ left: m.active ? 16 : 2 }}
                      />
                    </div>
                  </div>
                  <div className="text-text-muted mt-1 text-[12.5px] leading-relaxed">
                    {m.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-text-faint text-[11.5px] tracking-wider uppercase">
              Aparência
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {SETTINGS.map((s) => {
                const Icon = s.Icon;
                return (
                  <div
                    key={s.label}
                    className="bg-surface border-border flex items-center justify-between rounded-[10px] border px-3.5 py-3"
                  >
                    <span className="text-[13.5px]">{s.label}</span>
                    <span className="text-text-muted flex items-center gap-1.5 text-[12.5px]">
                      <Icon size={14} />
                      {s.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="mt-4 flex items-start gap-2.5 rounded-xl p-3 text-xs"
            style={{ background: tenant.primarySoft, color: tenant.primary }}
          >
            <Info size={14} className="mt-0.5 shrink-0" />
            <div>
              Suas escolhas viajam com você — no celular, no computador da
              escola, no WhatsApp.
            </div>
          </div>
        </div>
      </PhoneFrame>
    </PhoneStage>
  );
}
