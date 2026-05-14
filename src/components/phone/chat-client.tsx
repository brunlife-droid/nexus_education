"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  ArrowUp,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Sparkles,
  Tag,
  Volume2,
} from "lucide-react";
import { Chip } from "@/components/ui";

interface Message {
  role: "user" | "assistant";
  content: string;
  hora?: string;
  streaming?: boolean;
}

interface ChatClientProps {
  tenant: {
    primary: string;
    primaryFg: string;
    primarySoft: string;
    secondary: string;
    short: string;
    tutorName: string;
  };
  initialMessages: Message[];
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatClient({ tenant, initialMessages }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tutorInitial = tenant.tutorName[0];

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const now = formatTime(new Date());
    const userMsg: Message = { role: "user", content: text, hora: now };
    const placeholder: Message = {
      role: "assistant",
      content: "",
      hora: now,
      streaming: true,
    };
    const next = [...messages, userMsg, placeholder];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => !m.streaming)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk.type === "text" && chunk.text) {
              accumulated += chunk.text;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.streaming) {
                  copy[copy.length - 1] = { ...last, content: accumulated };
                }
                return copy;
              });
            } else if (chunk.type === "done") {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.streaming) {
                  copy[copy.length - 1] = { ...last, streaming: false };
                }
                return copy;
              });
            }
          } catch {
            // ignora linhas malformadas
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            "Tive um problema pra conectar agora. Tenta de novo daqui a pouco?",
          hora: now,
        };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  function applySuggestion(text: string) {
    setInput(text);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-6">
        <div
          className="relative flex size-8 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            background: tenant.primarySoft,
            color: tenant.primary,
            fontFamily: "var(--font-serif)",
          }}
        >
          {tutorInitial}
          <div className="bg-success border-surface absolute -right-px -bottom-px size-2.5 rounded-full border-2" />
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">{tenant.tutorName}</div>
          <div className="text-text-faint text-[11.5px]">
            tutora · {tenant.short.toLowerCase()}
          </div>
        </div>
        <div className="flex-1" />
        <div
          className="text-text-faint hidden items-center gap-1.5 text-[11.5px] sm:flex"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <Tag size={11} />
          EF07MA04 · Frações equivalentes
        </div>
      </header>

      {/* Mensagens */}
      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-8">
          <div className="text-text-faint flex items-center justify-center gap-2 text-[11.5px]">
            <span className="bg-border h-px flex-1" />
            <span>Hoje</span>
            <span className="bg-border h-px flex-1" />
          </div>

          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              message={m}
              tutorInitial={tutorInitial}
              tutorPrimary={tenant.primary}
              tutorSoft={tenant.primarySoft}
            />
          ))}

          {!sending && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applySuggestion("Pode explicar de outro jeito?")}
                className="hover:bg-surface-3 cursor-pointer"
              >
                <Chip className="hover:bg-surface-3">
                  <Sparkles size={11} style={{ color: tenant.primary }} />
                  Explicar de outro jeito
                </Chip>
              </button>
              <button
                type="button"
                onClick={() => applySuggestion("Me dá um exemplo prático.")}
              >
                <Chip className="hover:bg-surface-3">Me dá um exemplo</Chip>
              </button>
              <button type="button" onClick={() => applySuggestion("Ler em áudio.")}>
                <Chip className="hover:bg-surface-3">
                  <Volume2 size={11} />
                  Ouvir em áudio
                </Chip>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-border border-t px-6 py-4">
        <div className="mx-auto max-w-[760px]">
          <div className="bg-surface border-border-strong focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)] flex items-end gap-2 rounded-2xl border p-3 transition-all">
            <button
              type="button"
              aria-label="Anexar"
              className="text-text-muted hover:bg-surface-2 shrink-0 rounded-md p-2 transition-colors"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              aria-label="Tirar foto"
              className="text-text-muted hover:bg-surface-2 shrink-0 rounded-md p-2 transition-colors"
            >
              <ImageIcon size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              placeholder="Pergunte sobre matéria, mande foto ou áudio…"
              className="placeholder:text-text-faint flex-1 bg-transparent px-2 py-2 text-[14.5px] outline-none"
            />

            <button
              type="button"
              aria-label="Gravar áudio"
              className="text-text-muted hover:bg-surface-2 shrink-0 rounded-md p-2 transition-colors"
            >
              <Mic size={18} />
            </button>
            <button
              type="submit"
              aria-label="Enviar"
              disabled={!input.trim() || sending}
              className="shrink-0 rounded-md p-2 transition-colors disabled:opacity-40"
              style={{
                background: tenant.primary,
                color: tenant.primaryFg,
              }}
            >
              <ArrowUp size={18} />
            </button>
          </div>
          <div className="text-text-faint mt-2 text-center text-[11px]">
            {tenant.tutorName} ensina pelo método socrático — guia o raciocínio
            sem entregar respostas prontas.
          </div>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  tutorInitial,
  tutorPrimary,
  tutorSoft,
}: {
  message: Message;
  tutorInitial: string;
  tutorPrimary: string;
  tutorSoft: string;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-surface-2 max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{
          background: tutorSoft,
          color: tutorPrimary,
          fontFamily: "var(--font-serif)",
        }}
      >
        {tutorInitial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
          {message.streaming && (
            <span
              className="ml-1 inline-block h-4 w-0.5 align-middle"
              style={{
                background: tutorPrimary,
                animation: "blink 1s infinite",
              }}
            />
          )}
        </div>
        {message.hora && !message.streaming && (
          <div className="text-text-faint mt-1.5 text-[11px]">{message.hora}</div>
        )}
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
    </div>
  );
}
