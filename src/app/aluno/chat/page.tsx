import { Sparkles, Tag } from "lucide-react";
import { Chip } from "@/components/ui";
import {
  ChatBubble,
  ChatHeader,
  ChatInput,
  PhoneFrame,
  PhoneStage,
  StatusBar,
} from "@/components/phone";
import { getCurrentTenant } from "@/lib/tenants/server";
import { CHAT_INICIAL } from "@/lib/mocks";

export default async function ChatPage() {
  const tenant = await getCurrentTenant();
  const tutorInitial = tenant.tutorName[0];

  return (
    <PhoneStage
      label={`A2 · Chat principal · ${tenant.short}`}
      description={`Tutor "${tenant.tutorName}". Ensina socraticamente — guia em vez de entregar resposta pronta. Input multimodal (texto, foto, áudio). Botão "explicar de outro jeito".`}
    >
      <PhoneFrame label="Chat ativo · método socrático">
        <StatusBar />
        <ChatHeader tenant={tenant} />
        <div className="scroll-thin bg-surface-2 flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
          <div className="bg-surface border-border text-text-faint self-center rounded-full border px-2.5 py-1 text-[11px]">
            Hoje · 15:32
          </div>
          {CHAT_INICIAL.map((m, i) => (
            <ChatBubble
              key={i}
              from={m.from}
              tutorInitial={tutorInitial}
              hora={m.hora}
            >
              {m.text}
            </ChatBubble>
          ))}
          <div className="mt-1 flex flex-wrap gap-1.5 self-start">
            <Chip className="bg-surface text-[11.5px]">
              <Sparkles size={11} style={{ color: tenant.primary }} />
              Explicar de outro jeito
            </Chip>
            <Chip className="bg-surface text-[11.5px]">Me dá um exemplo</Chip>
            <Chip className="bg-surface text-[11.5px]">Ouvir em áudio 🔊</Chip>
          </div>
        </div>
        <ChatInput tenant={tenant} />
      </PhoneFrame>

      <PhoneFrame label="Foto de exercício enviada">
        <StatusBar />
        <ChatHeader tenant={tenant} />
        <div className="scroll-thin bg-surface-2 flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
          <div className="flex max-w-[76%] flex-col gap-1 self-end">
            <div className="bg-surface-3 border-border flex h-32 items-center justify-center rounded-lg border text-xs">
              <span
                className="text-text-faint"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                foto · questão.jpg
              </span>
            </div>
            <div className="text-text-faint text-right text-[10.5px]">
              15:34 ✓✓
            </div>
          </div>
          <ChatBubble from="tutor" tutorInitial={tutorInitial} hora="15:34">
            Vi a foto! É uma questão de equação do 1º grau. Vamos passo a passo?
            <br />
            <br />
            Primeiro, me conta: o que você precisa <b>descobrir</b> nessa
            questão?
          </ChatBubble>
          <div
            className="flex items-center gap-2 self-start rounded-2xl px-3 py-2 text-[12.5px]"
            style={{ background: tenant.primarySoft, color: tenant.primary }}
          >
            <Tag size={12} /> EF07MA13 · Equações 1º grau
          </div>
        </div>
        <ChatInput tenant={tenant} />
      </PhoneFrame>
    </PhoneStage>
  );
}
