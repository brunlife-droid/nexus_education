import { ArrowRight, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { PhoneFrame, PhoneStage, StatusBar } from "@/components/phone";
import { getCurrentTenant } from "@/lib/tenants/server";

export default async function OnboardingPage() {
  const tenant = await getCurrentTenant();

  return (
    <PhoneStage
      label={`A1 · Onboarding · ${tenant.short}`}
      description="Boas-vindas com a persona do tutor, dados pré-preenchidos da escola, tour rápido e termo adaptado à linguagem do aluno."
    >
      {/* 1 · Boas-vindas */}
      <PhoneFrame label="1 · Boas-vindas">
        <StatusBar />
        <div className="flex flex-1 flex-col gap-4 px-6 pt-2 pb-6">
          <div className="text-text-faint mt-3 text-[11.5px] tracking-widest uppercase">
            {tenant.short} · Educação
          </div>
          <div
            className="mx-auto mt-2 flex h-36 w-36 items-center justify-center rounded-full shadow-[var(--shadow-lg)]"
            style={{
              background: `linear-gradient(135deg, ${tenant.primary} 0%, ${tenant.primary} 60%, ${tenant.secondary} 100%)`,
              color: tenant.primaryFg,
              fontFamily: "var(--font-serif)",
              fontSize: 56,
              fontWeight: 600,
            }}
          >
            {tenant.tutorName[0]}
          </div>
          <div className="mt-2 text-center">
            <div className="text-[22px] font-semibold tracking-tight">
              Oi, eu sou a {tenant.tutorName}
            </div>
            <div className="text-text-muted mt-1.5 text-sm leading-relaxed">
              Sou sua tutora da rede municipal. Vou estudar com você, tirar
              suas dúvidas e lembrar do seu jeito de aprender.
            </div>
          </div>
          <div className="flex-1" />
          <Button size="lg" className="w-full justify-center" iconRight={<ArrowRight size={16} />}>
            Começar
          </Button>
          <Button
            variant="ghost"
            className="text-text-faint w-full justify-center text-xs"
          >
            Já tenho conta — entrar
          </Button>
        </div>
      </PhoneFrame>

      {/* 2 · Seus dados */}
      <PhoneFrame label="2 · Seus dados">
        <StatusBar />
        <div className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-5">
          <div className="mt-2 flex gap-1">
            <div className="bg-primary h-1 flex-1 rounded-sm" />
            <div className="bg-primary h-1 flex-1 rounded-sm" />
            <div className="bg-border h-1 flex-1 rounded-sm" />
            <div className="bg-border h-1 flex-1 rounded-sm" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">
              Confirma se é você?
            </div>
            <div className="text-text-muted mt-1 text-[13px]">
              A escola já me passou seus dados. Confere?
            </div>
          </div>
          {[
            { lbl: "Nome", val: "João Pedro Silva" },
            { lbl: "Escola", val: "EM Dr. Sebastião Gualberto" },
            { lbl: "Turma", val: "7º ano A" },
            { lbl: "Como você gosta de ser chamado?", val: "João", edit: true },
          ].map((f) => (
            <div key={f.lbl}>
              <div className="text-text-faint mb-1 text-[11.5px] tracking-wider uppercase">
                {f.lbl}
              </div>
              <div
                className={`flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-[15px] ${
                  f.edit
                    ? "border-primary bg-surface"
                    : "bg-surface-2 border-border"
                }`}
              >
                {f.val}
                {f.edit && <Pencil size={14} />}
              </div>
            </div>
          ))}
          <div className="flex-1" />
          <Button size="lg" className="w-full justify-center" iconRight={<ArrowRight size={16} />}>
            Tudo certo — continuar
          </Button>
        </div>
      </PhoneFrame>

      {/* 3 · Tour */}
      <PhoneFrame label="3 · O que posso pedir">
        <StatusBar />
        <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-5">
          <div className="text-text-muted flex justify-end text-xs">
            <span>Pular</span>
          </div>
          <div
            className="flex flex-col gap-3 rounded-2xl p-4.5"
            style={{ background: tenant.primarySoft }}
          >
            <div
              className="text-base font-semibold tracking-tight"
              style={{ color: tenant.primary }}
            >
              Eu sou só pra estudo.
            </div>
            <div className="text-text-muted text-sm leading-relaxed">
              Pode me mandar foto da questão, áudio, texto. Eu te ajudo a
              entender — não dou só a resposta pronta.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Fazer o dever",
              "Tirar dúvida",
              "Estudar pra prova",
              "Foto de exercício",
            ].map((c) => (
              <div
                key={c}
                className="bg-surface-2 text-text flex flex-col gap-1.5 rounded-xl p-3 text-[13px]"
              >
                <div className="bg-primary-soft text-primary inline-flex w-fit rounded-md p-1.5">
                  <Check size={12} />
                </div>
                {c}
              </div>
            ))}
          </div>
          <div className="flex-1" />
          <div className="mb-1.5 flex justify-center gap-1">
            <div
              className="h-1.5 rounded-sm"
              style={{ background: tenant.primary, width: 18 }}
            />
            <div className="bg-border-strong h-1.5 w-1.5 rounded-sm" />
            <div className="bg-border-strong h-1.5 w-1.5 rounded-sm" />
          </div>
          <Button size="lg" className="w-full justify-center">
            Próximo
          </Button>
        </div>
      </PhoneFrame>

      {/* 4 · Termo */}
      <PhoneFrame label="4 · Termo (adaptado)">
        <StatusBar />
        <div className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-5">
          <div className="text-xl font-semibold tracking-tight">
            Combinado entre a gente
          </div>
          <div className="text-text-muted text-[13px]">
            Antes de começar, leia bem rapidinho. Vou ler em voz alta se
            preferir.
          </div>
          {[
            {
              ico: "🤝",
              t: "Suas conversas são privadas.",
              s: "Só você, a escola e seus responsáveis veem. Ninguém da internet.",
            },
            {
              ico: "🧠",
              t: "Eu vou guardar o que ajuda você aprender.",
              s: "Tipo: quando frações ficam difíceis, ou quando você manda bem em redação.",
            },
            {
              ico: "🚨",
              t: "Se você me contar algo grave, eu aviso quem cuida de você.",
              s: "Bullying, violência ou tristeza muito grande. Não fico sozinha com isso.",
            },
          ].map((r, i) => (
            <div
              key={i}
              className={`flex gap-3 py-3 ${i ? "border-border border-t" : ""}`}
            >
              <div className="text-2xl">{r.ico}</div>
              <div>
                <div className="text-sm font-medium">{r.t}</div>
                <div className="text-text-muted mt-0.5 text-[12.5px] leading-relaxed">
                  {r.s}
                </div>
              </div>
            </div>
          ))}
          <label className="text-text-muted mt-1 flex items-start gap-2.5 text-[13px]">
            <span
              className="bg-primary border-primary mt-px flex size-[18px] items-center justify-center rounded-sm border-2 text-white"
            >
              <Check size={12} />
            </span>
            <span>Li, entendi e estou de acordo. Meu responsável também sabe.</span>
          </label>
          <div className="flex-1" />
          <Button size="lg" className="w-full justify-center">
            Bora estudar
          </Button>
        </div>
      </PhoneFrame>
    </PhoneStage>
  );
}
