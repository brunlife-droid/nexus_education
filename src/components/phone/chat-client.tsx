"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUp,
  BookOpenCheck,
  Camera,
  ClipboardList,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Layers3,
  Lightbulb,
  Loader2,
  Mic,
  Paperclip,
  Sparkles,
  Volume2,
} from "lucide-react";
import { LlmMarkdown } from "@/components/llm";
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

type QuickAction =
  | {
      kind: "prompt";
      label: string;
      helper: string;
      prompt: string;
      icon: LucideIcon;
      tone: string;
    }
  | {
      kind: "upload";
      label: string;
      helper: string;
      icon: LucideIcon;
      tone: string;
    }
  | {
      kind: "study";
      label: string;
      helper: string;
      icon: LucideIcon;
      tone: string;
    };

const QUICK_ACTIONS: QuickAction[] = [
  {
    kind: "prompt",
    label: "Me guia passo a passo",
    helper: "A tutora pergunta antes de entregar a resposta.",
    prompt: "Me guia passo a passo, sem entregar a resposta pronta.",
    icon: Lightbulb,
    tone: "border-warning/25 bg-warning-soft text-warning-fg",
  },
  {
    kind: "upload",
    label: "Enviar foto da questão",
    helper: "Use imagem, áudio, PDF ou texto da tarefa.",
    icon: Camera,
    tone: "border-accent-sky/25 bg-accent-sky-soft text-accent-sky",
  },
  {
    kind: "prompt",
    label: "Treinar com exemplo",
    helper: "Receba um exemplo parecido e tente resolver.",
    prompt: "Me dá um exemplo parecido para eu tentar resolver.",
    icon: ClipboardList,
    tone: "border-accent-violet/25 bg-accent-violet-soft text-accent-violet",
  },
  {
    kind: "study",
    label: "Criar estudo ativo",
    helper: "Transforme a conversa em cartões, quiz ou resumo.",
    icon: Layers3,
    tone: "border-success/25 bg-success-soft text-success-fg",
  },
];

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
  if (kind === "audio") return "Transcreva este áudio e me ajude a estudar.";
  return "Analise este documento e me ajude a estudar.";
}

function formatBytes(size?: number): string | null {
  if (!size || size < 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tutorInitial = tenant.tutorName[0] ?? "N";
  const studyHref = conversationId
    ? `/aluno/estudo?conversationId=${conversationId}`
    : "/aluno/estudo";
  const activity = uploading
    ? {
        label: "Recebendo arquivo",
      }
    : sending
      ? {
          label: "Montando próximo passo",
        }
      : {
          label: conversationId ? "Conversa salva" : "Pronta para estudar",
        };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

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
            // skip malformed chunks
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [input]);

  async function submitText() {
    const text = input.trim();
    if (!text || sending || uploading) return;

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

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    await submitText();
  }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    void submitText();
  }

  function applySuggestion(text: string) {
    setInput(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        tenant={tenant}
        tutorInitial={tutorInitial}
        busy={sending || uploading}
      />

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[880px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">
          <StudyKickoffPanel
            tenant={tenant}
            disabled={sending || uploading}
            studyHref={studyHref}
            onAttach={() => fileInputRef.current?.click()}
            onPick={applySuggestion}
          />

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
            <FollowUpActions
              studyHref={studyHref}
              primary={tenant.primary}
              onPick={applySuggestion}
            />
          )}
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="border-border/80 bg-surface-raised/95 shrink-0 border-t px-4 py-3 shadow-[0_-10px_28px_rgba(16,24,40,0.06)] sm:px-6 sm:py-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,.md,.txt,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="mx-auto max-w-[880px]">
          {(uploading || sending) && (
            <div
              aria-live="polite"
              className="border-primary-border bg-primary-soft text-text-muted mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            >
              <Loader2
                size={14}
                className="text-primary motion-safe:animate-spin"
              />
              <span>{activity.label}</span>
            </div>
          )}

          <div className="border-border-strong bg-surface-raised focus-within:border-primary focus-within:shadow-[0_0_0_4px_var(--primary-soft)] flex items-end gap-1.5 rounded-lg border p-2 shadow-[var(--shadow-sm)] transition-all sm:gap-2 sm:p-3">
            <ComposerIconButton
              label="Anexar arquivo"
              icon={Paperclip}
              disabled={uploading || sending}
              onClick={() => fileInputRef.current?.click()}
            />
            <ComposerIconButton
              label="Enviar foto"
              icon={ImageIcon}
              disabled={uploading || sending}
              onClick={() => fileInputRef.current?.click()}
            />

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={sending || uploading}
              placeholder="Pergunte, cole sua dúvida ou descreva o arquivo..."
              className="placeholder:text-text-faint max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none"
            />

            <ComposerIconButton
              label="Enviar áudio"
              icon={Mic}
              disabled={uploading || sending}
              onClick={() => fileInputRef.current?.click()}
            />
            <button
              type="submit"
              aria-label="Enviar mensagem"
              disabled={!input.trim() || sending || uploading}
              className="grid size-10 shrink-0 place-items-center rounded-md shadow-[var(--shadow-xs)] transition-all hover:-translate-y-px disabled:translate-y-0 disabled:opacity-40"
              style={{
                background: tenant.primary,
                color: tenant.primaryFg,
              }}
            >
              <ArrowUp size={18} />
            </button>
          </div>
          <div className="text-text-faint mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px]">
            <span>{tenant.tutorName} guia o raciocínio sem entregar tudo pronto.</span>
            <span className="hidden sm:inline">Enter envia, Shift+Enter quebra linha.</span>
          </div>
        </div>
      </form>
    </div>
  );
}

function ChatHeader({
  tenant,
  tutorInitial,
  busy,
}: {
  tenant: ChatClientProps["tenant"];
  tutorInitial: string;
  busy: boolean;
}) {
  return (
    <header className="border-border/80 bg-surface-raised/95 shrink-0 border-b px-4 py-3 shadow-[var(--shadow-xs)] sm:px-6">
      <div className="mx-auto flex max-w-[980px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="relative grid size-10 shrink-0 place-items-center rounded-lg text-base font-semibold shadow-[var(--shadow-sm)]"
            style={{
              background: tenant.primarySoft,
              color: tenant.primary,
              fontFamily: "var(--font-serif)",
            }}
          >
            {tutorInitial}
            <div className="border-surface bg-success absolute -right-px -bottom-px size-3 rounded-full border-2" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold sm:text-base">
                {tenant.tutorName}
              </h1>
              <span className="border-success/25 bg-success-soft text-success-fg inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                online
              </span>
            </div>
            <div className="text-text-muted mt-1 flex flex-wrap items-center gap-2 text-[12px]">
              <span>{tenant.short}</span>
              <span className="text-text-faint">•</span>
              <span>{busy ? "respondendo agora" : "tutoria socrática"}</span>
            </div>
          </div>
        </div>
        <Link
          href="/aluno/estudo"
          className="border-primary-border bg-primary-soft text-primary hidden items-center gap-2 rounded-md border px-3 py-2 text-[12.5px] font-medium transition-colors hover:bg-surface-tint sm:inline-flex"
        >
          <Layers3 size={14} />
          Estudo ativo
        </Link>
      </div>
    </header>
  );
}

function StudyKickoffPanel({
  tenant,
  disabled,
  studyHref,
  onAttach,
  onPick,
}: {
  tenant: ChatClientProps["tenant"];
  disabled: boolean;
  studyHref: string;
  onAttach: () => void;
  onPick: (text: string) => void;
}) {
  return (
    <section className="soft-band rounded-lg p-3 shadow-[var(--shadow-sm)] sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} style={{ color: tenant.primary }} />
            Escolha um começo para estudar melhor
          </div>
          <p className="text-text-muted mt-1 text-[13px] leading-relaxed">
            A conversa pode virar explicação guiada, análise de material ou estudo
            ativo.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            if (action.kind === "study") {
              return (
                <Link
                  key={action.label}
                  href={studyHref}
                  className={`lift-on-hover flex min-h-[76px] items-start gap-2 rounded-lg border p-3 text-left ${action.tone}`}
                >
                  <Icon size={17} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold">
                      {action.label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug opacity-80">
                      {action.helper}
                    </span>
                  </span>
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                disabled={disabled}
                onClick={() =>
                  action.kind === "upload" ? onAttach() : onPick(action.prompt)
                }
                className={`lift-on-hover flex min-h-[76px] items-start gap-2 rounded-lg border p-3 text-left disabled:opacity-50 ${action.tone}`}
              >
                <Icon size={17} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold">
                    {action.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug opacity-80">
                    {action.helper}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FollowUpActions({
  studyHref,
  primary,
  onPick,
}: {
  studyHref: string;
  primary: string;
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onPick("Pode explicar de outro jeito?")}
        className="cursor-pointer"
      >
        <Chip className="hover:bg-surface-3">
          <Sparkles size={11} style={{ color: primary }} />
          Explicar de outro jeito
        </Chip>
      </button>
      <button
        type="button"
        onClick={() => onPick("Me dá um exemplo prático.")}
      >
        <Chip className="hover:bg-surface-3">
          <Lightbulb size={11} />
          Me dá um exemplo
        </Chip>
      </button>
      <button type="button" onClick={() => onPick("Ler em áudio.")}>
        <Chip className="hover:bg-surface-3">
          <Volume2 size={11} />
          Ouvir em áudio
        </Chip>
      </button>
      <Link href={studyHref}>
        <Chip className="hover:bg-surface-3">
          <FileText size={11} />
          Criar estudo
        </Chip>
      </Link>
    </div>
  );
}

function ComposerIconButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="text-text-muted hover:bg-primary-soft hover:text-primary grid size-10 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-40"
    >
      <Icon size={18} />
    </button>
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
      <div className="flex flex-col items-end gap-2">
        {message.attachments?.map((attachment, index) => (
          <AttachmentPreview
            key={`${attachment.url}-${index}`}
            attachment={attachment}
          />
        ))}
        {message.content && (
          <div className="border-primary-border bg-primary-soft text-text max-w-[86%] rounded-lg rounded-tr-sm border px-4 py-3 text-[15px] leading-relaxed shadow-[var(--shadow-xs)] sm:max-w-[74%]">
            {message.content}
            {message.hora && (
              <div className="text-text-faint mt-1.5 text-right text-[11px]">
                {message.hora}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <article className="flex gap-2.5 sm:gap-3">
      <div
        className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold shadow-[var(--shadow-xs)]"
        style={{
          background: tutorSoft,
          color: tutorPrimary,
          fontFamily: "var(--font-serif)",
        }}
      >
        {tutorInitial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="border-border bg-surface-raised relative rounded-lg rounded-tl-sm border px-4 py-3 text-[15px] leading-relaxed shadow-[var(--shadow-sm)]">
          <div
            className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full"
            style={{ background: tutorPrimary }}
          />
          <div className="pl-2">
            {message.content && (
              <LlmMarkdown content={message.content} variant="chat" />
            )}
            {message.streaming && !message.content && (
              <ThinkingIndicator color={tutorPrimary} />
            )}
            {message.streaming && message.content && (
              <span
                className="ml-1 inline-block h-4 w-0.5 align-middle motion-safe:animate-pulse"
                style={{ background: tutorPrimary }}
              />
            )}
          </div>
        </div>
        {message.hora && !message.streaming && (
          <div className="text-text-faint mt-1.5 text-[11px]">{message.hora}</div>
        )}
        {!message.streaming && message.sources && message.sources.length > 0 && (
          <SourceList sources={message.sources} />
        )}
      </div>
    </article>
  );
}

function ThinkingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="size-1.5 rounded-full motion-safe:animate-pulse"
            style={{
              background: color,
              animationDelay: `${item * 120}ms`,
            }}
          />
        ))}
      </span>
      <span>Preparando uma pergunta melhor...</span>
    </div>
  );
}

function AttachmentPreview({
  attachment,
}: {
  attachment: ChatFileAttachment;
}) {
  const size = formatBytes(attachment.size);
  if (attachment.kind === "image") {
    return (
      <figure className="max-w-[72%] sm:max-w-[58%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name ?? "Imagem enviada"}
          className="border-primary-border max-h-[320px] w-full rounded-lg rounded-tr-sm border object-cover shadow-[var(--shadow-md)]"
        />
        <figcaption className="text-text-faint mt-1 truncate text-right text-[11px]">
          {attachment.name ?? "Imagem enviada"}
          {size ? ` · ${size}` : ""}
        </figcaption>
      </figure>
    );
  }

  if (attachment.kind === "audio") {
    return (
      <div className="border-primary-border bg-primary-soft w-full max-w-[390px] rounded-lg rounded-tr-sm border p-3 shadow-[var(--shadow-sm)]">
        <div className="text-text-muted mb-2 flex items-center gap-2 text-xs">
          <FileAudio size={14} />
          <span className="truncate">{attachment.name ?? "Áudio enviado"}</span>
          {size && <span className="text-text-faint shrink-0">{size}</span>}
        </div>
        <audio controls src={attachment.url} className="w-full" />
      </div>
    );
  }

  return (
    <div className="border-primary-border bg-primary-soft text-text-muted flex max-w-[390px] items-center gap-3 rounded-lg rounded-tr-sm border px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
      <FileText size={17} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-text">
          {attachment.name ?? "Documento enviado"}
        </span>
        {size && <span className="text-text-faint text-[11px]">{size}</span>}
      </span>
    </div>
  );
}

function SourceList({ sources }: { sources: MessageSource[] }) {
  return (
    <div className="border-info/20 bg-info-soft mt-3 rounded-lg border p-3">
      <div className="text-text flex items-center gap-2 text-xs font-semibold">
        <BookOpenCheck size={14} />
        Material da turma usado
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {sources.slice(0, 3).map((source) => (
          <div
            key={`${source.documentId}-${source.chunkIndex}`}
            className="border-border bg-surface-raised text-text-muted flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px]"
            title={`${source.documentName} - trecho ${source.chunkIndex + 1}`}
          >
            <FileText size={12} className="shrink-0" />
            <span className="truncate">{source.documentName}</span>
            <span className="text-text-faint shrink-0">
              trecho {source.chunkIndex + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
