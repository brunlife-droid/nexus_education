"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Sparkles,
  Tag,
  Volume2,
} from "lucide-react";
import { Chip } from "@/components/ui";

export interface MessageSource {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  score: number;
}

export interface ChatFileAttachment {
  kind: "image" | "audio" | "document";
  url: string;
  mime: string;
  name?: string;
  size?: number;
  transcript?: string;
  extractedText?: string;
  analysisError?: string;
}

export interface ChatClientMessage {
  role: "user" | "assistant";
  content: string;
  hora?: string;
  streaming?: boolean;
  attachments?: ChatFileAttachment[];
  sources?: MessageSource[];
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
  initialMessages: ChatClientMessage[];
  initialConversationId?: string | null;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeSources(value: unknown): MessageSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is MessageSource => {
      return (
        !!item &&
        typeof item === "object" &&
        "documentId" in item &&
        "documentName" in item &&
        "chunkIndex" in item
      );
    })
    .map((item) => ({
      documentId: String(item.documentId),
      documentName: String(item.documentName),
      chunkIndex: Number(item.chunkIndex),
      score: Number(item.score ?? 0),
    }));
}

function attachmentKindFor(file: File): ChatFileAttachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function uploadPromptFor(kind: ChatFileAttachment["kind"]): string {
  if (kind === "image") return "Analise esta imagem e me ajude a estudar.";
  if (kind === "audio") return "Transcreva este audio e me ajude a estudar.";
  return "Analise este documento e me ajude a estudar.";
}

export function ChatClient({
  tenant,
  initialMessages,
  initialConversationId = null,
}: ChatClientProps) {
  const [messages, setMessages] =
    useState<ChatClientMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tutorInitial = tenant.tutorName[0];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reseta para permitir reupload do mesmo arquivo

    setUploading(true);
    const now = formatTime(new Date());

    try {
      const kind = attachmentKindFor(file);
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");

      const typedText = input.trim();
      const userMsg: ChatClientMessage = {
        role: "user",
        content: typedText || uploadPromptFor(kind),
        attachments: [
          {
            kind,
            url: data.file.url,
            mime: data.file.contentType || file.type,
            name: file.name,
            size: data.file.size ?? file.size,
          },
        ],
        hora: now,
      };
      const placeholder: ChatClientMessage = {
        role: "assistant",
        content: "",
        hora: now,
        streaming: true,
      };
      const next = [...messages, userMsg, placeholder];
      setMessages(next);
      setInput("");

      await streamReply(next);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Não consegui receber seu arquivo agora. Tente de novo, por favor.",
          hora: now,
        },
      ]);
    } finally {
      setUploading(false);
    }
  }

  async function streamReply(history: ChatClientMessage[]) {
    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: history
            .filter((m) => !m.streaming)
            .map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            })),
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
            if (chunk.type === "meta" && chunk.conversationId) {
              setConversationId((prev) => {
                if (prev === chunk.conversationId) return prev;
                if (typeof window !== "undefined") {
                  const url = new URL(window.location.href);
                  url.searchParams.set("id", chunk.conversationId);
                  window.history.replaceState({}, "", url.toString());
                }
                return chunk.conversationId;
              });
            } else if (chunk.type === "text" && chunk.text) {
              accumulated += chunk.text;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.streaming) {
                  copy[copy.length - 1] = { ...last, content: accumulated };
                }
                return copy;
              });
            } else if (chunk.type === "sources") {
              const sources = normalizeSources(chunk.sources);
              if (sources.length > 0) {
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.streaming) {
                    copy[copy.length - 1] = { ...last, sources };
                  }
                  return copy;
                });
              }
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
            // skip malformed
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.streaming) {
          copy[copy.length - 1] = {
            role: "assistant",
            content:
              "Tive um problema pra conectar agora. Tenta de novo daqui a pouco?",
            hora: formatTime(new Date()),
          };
        }
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

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
    const userMsg: ChatClientMessage = { role: "user", content: text, hora: now };
    const placeholder: ChatClientMessage = {
      role: "assistant",
      content: "",
      hora: now,
      streaming: true,
    };
    const next = [...messages, userMsg, placeholder];
    setMessages(next);
    setInput("");
    await streamReply(next);
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
              <Link
                href={
                  conversationId
                    ? `/aluno/estudo?conversationId=${conversationId}`
                    : "/aluno/estudo"
                }
              >
                <Chip className="hover:bg-surface-3">
                  <FileText size={11} />
                  Criar estudo
                </Chip>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-border border-t px-6 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,.md,.txt,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="mx-auto max-w-[760px]">
          <div className="bg-surface border-border-strong focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--primary-soft)] flex items-end gap-2 rounded-2xl border p-3 transition-all">
            <button
              type="button"
              aria-label="Anexar"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              className="text-text-muted hover:bg-surface-2 shrink-0 rounded-md p-2 transition-colors disabled:opacity-40"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              aria-label="Tirar foto"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              className="text-text-muted hover:bg-surface-2 shrink-0 rounded-md p-2 transition-colors disabled:opacity-40"
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
              aria-label="Enviar áudio"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
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
  message: ChatClientMessage;
  tutorInitial: string;
  tutorPrimary: string;
  tutorSoft: string;
}) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.attachments?.map((attachment, index) => (
          <AttachmentPreview
            key={`${attachment.url}-${index}`}
            attachment={attachment}
          />
        ))}
        {message.content && (
          <div className="bg-surface-2 max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-relaxed">
            {message.content}
          </div>
        )}
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
        {!message.streaming && message.sources && message.sources.length > 0 && (
          <SourceList sources={message.sources} />
        )}
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
    </div>
  );
}

function AttachmentPreview({
  attachment,
}: {
  attachment: ChatFileAttachment;
}) {
  if (attachment.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.url}
        alt={attachment.name ?? "Imagem enviada"}
        className="border-border max-h-[300px] max-w-[60%] rounded-2xl rounded-tr-md border object-cover shadow-[var(--shadow-sm)]"
      />
    );
  }

  if (attachment.kind === "audio") {
    return (
      <div className="border-border bg-surface-2 w-full max-w-[360px] rounded-2xl rounded-tr-md border p-3 shadow-[var(--shadow-sm)]">
        <div className="text-text-muted mb-2 flex items-center gap-2 text-xs">
          <Mic size={13} />
          <span className="truncate">{attachment.name ?? "Áudio enviado"}</span>
        </div>
        <audio controls src={attachment.url} className="w-full" />
      </div>
    );
  }

  return (
    <div className="border-border bg-surface-2 text-text-muted flex max-w-[360px] items-center gap-2 rounded-2xl rounded-tr-md border px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
      <FileText size={16} className="shrink-0" />
      <span className="min-w-0 truncate">
        {attachment.name ?? "Documento enviado"}
      </span>
    </div>
  );
}

function SourceList({ sources }: { sources: MessageSource[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sources.slice(0, 3).map((source) => (
        <div
          key={`${source.documentId}-${source.chunkIndex}`}
          className="border-border bg-surface-2 text-text-muted flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px]"
          title={`${source.documentName} - trecho ${source.chunkIndex + 1}`}
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">Fonte: {source.documentName}</span>
          <span className="text-text-faint shrink-0">
            trecho {source.chunkIndex + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
