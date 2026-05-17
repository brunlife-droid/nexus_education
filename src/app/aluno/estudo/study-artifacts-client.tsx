"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  StudentArtifact,
  StudentArtifactContent,
  StudentArtifactKind,
} from "@/lib/student/artifacts";
import { cn } from "@/lib/cn";

type ClientArtifact = Omit<StudentArtifact, "createdAt"> & {
  createdAt: string;
};

interface Props {
  tenant: {
    primary: string;
    primaryFg: string;
    primarySoft: string;
    secondary: string;
    short: string;
    tutorName: string;
  };
  conversationId: string | null;
  initialArtifacts: ClientArtifact[];
}

const MODES: Array<{
  kind: StudentArtifactKind;
  label: string;
  icon: typeof Layers3;
}> = [
  { kind: "flashcards", label: "Cartões", icon: Layers3 },
  { kind: "quiz", label: "Quiz", icon: ClipboardList },
  { kind: "summary", label: "Resumo", icon: BookOpenCheck },
];

export function StudyArtifactsClient({
  tenant,
  conversationId,
  initialArtifacts,
}: Props) {
  const [artifacts, setArtifacts] = useState<ClientArtifact[]>(initialArtifacts);
  const [activeKind, setActiveKind] =
    useState<StudentArtifactKind>("flashcards");
  const [topic, setTopic] = useState("");
  const [current, setCurrent] = useState<ClientArtifact | null>(
    initialArtifacts[0] ?? null,
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateArtifact() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/student-artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: activeKind,
          topic: topic.trim(),
          conversationId,
        }),
      });
      const data = (await response.json()) as {
        artifact?: ClientArtifact;
        error?: string;
      };
      if (!response.ok || !data.artifact) {
        throw new Error(data.error ?? "Falha ao gerar estudo.");
      }
      const artifact = {
        ...data.artifact,
        createdAt: data.artifact.createdAt ?? new Date().toISOString(),
      };
      setArtifacts((prev) => [artifact, ...prev.filter((a) => a.id !== artifact.id)]);
      setCurrent(artifact);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-text-faint text-[11.5px] font-semibold tracking-widest uppercase">
              Estudo ativo - {tenant.short}
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Cartões, quiz e resumo guiado
            </h1>
            <p className="text-text-muted mt-2 max-w-2xl text-[15px] leading-relaxed">
              Transforme uma conversa, imagem, áudio ou documento em prática
              curta para revisar com a {tenant.tutorName}.
            </p>
          </div>
          <div
            className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{ background: tenant.primarySoft, color: tenant.primary }}
          >
            <Brain size={16} />
            Artefatos salvos no histórico pedagógico
          </div>
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="border-border bg-surface rounded-lg border">
            <div className="border-border flex flex-col gap-4 border-b p-5">
              <div className="flex flex-wrap gap-2">
                {MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = activeKind === mode.kind;
                  return (
                    <button
                      key={mode.kind}
                      type="button"
                      onClick={() => setActiveKind(mode.kind)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "border-transparent"
                          : "border-border-strong text-text-muted hover:bg-surface-2",
                      )}
                      style={
                        active
                          ? {
                              background: tenant.primary,
                              color: tenant.primaryFg,
                            }
                          : undefined
                      }
                    >
                      <Icon size={15} />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder={
                    conversationId
                      ? "Tema opcional para orientar a conversa atual"
                      : "Digite o tema: frações, fotossíntese, texto argumentativo..."
                  }
                  className="border-border-strong bg-surface placeholder:text-text-faint focus:border-primary h-11 rounded-lg border px-3 text-[14px] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={generateArtifact}
                  disabled={generating || (!conversationId && !topic.trim())}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-45"
                  style={{ background: tenant.primary, color: tenant.primaryFg }}
                >
                  {generating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Gerar
                </button>
              </div>
              {error && (
                <div className="text-danger-fg bg-danger-soft rounded-md px-3 py-2 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="min-h-[520px] p-5">
              {current ? (
                <ArtifactViewer artifact={current} tenant={tenant} />
              ) : (
                <EmptyArtifactState tenant={tenant} />
              )}
            </div>
          </section>

          <aside className="border-border bg-surface h-fit rounded-lg border">
            <div className="border-border border-b p-4">
              <div className="text-sm font-semibold">Recentes</div>
              <div className="text-text-muted mt-1 text-xs">
                Materiais gerados para estudar depois.
              </div>
            </div>
            <div className="max-h-[620px] overflow-y-auto p-2">
              {artifacts.length === 0 ? (
                <div className="text-text-muted px-3 py-8 text-center text-sm">
                  Nada salvo ainda.
                </div>
              ) : (
                artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => setCurrent(artifact)}
                    className={cn(
                      "hover:bg-surface-2 flex w-full flex-col gap-1 rounded-md px-3 py-3 text-left transition-colors",
                      current?.id === artifact.id && "bg-surface-2",
                    )}
                  >
                    <span className="text-[13px] font-medium">
                      {artifact.title}
                    </span>
                    <span className="text-text-faint text-[11.5px]">
                      {kindLabel(artifact.kind)} · {formatDate(artifact.createdAt)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ArtifactViewer({
  artifact,
  tenant,
}: {
  artifact: ClientArtifact;
  tenant: Props["tenant"];
}) {
  const content = artifact.content;
  return (
    <div className="h-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-text-faint text-xs font-semibold uppercase tracking-widest">
            {kindLabel(artifact.kind)}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {artifact.title}
          </h2>
        </div>
        <div className="text-text-faint text-xs">
          {artifact.provider ?? "ia"} · {artifact.model ?? "modelo"}
        </div>
      </div>

      {content.kind === "flashcards" && (
        <FlashcardViewer content={content} tenant={tenant} />
      )}
      {content.kind === "quiz" && <QuizViewer content={content} tenant={tenant} />}
      {content.kind === "summary" && <SummaryViewer content={content} />}
    </div>
  );
}

function FlashcardViewer({
  content,
  tenant,
}: {
  content: Extract<StudentArtifactContent, { kind: "flashcards" }>;
  tenant: Props["tenant"];
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = content.cards[index] ?? content.cards[0];
  if (!card) return null;

  function move(next: number) {
    setIndex((prev) => {
      const length = content.cards.length;
      return (prev + next + length) % length;
    });
    setRevealed(false);
  }

  return (
    <div className="flex min-h-[430px] flex-col">
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        className="border-border bg-surface-2 flex flex-1 flex-col justify-center rounded-lg border p-8 text-left"
      >
        <div className="text-text-faint text-xs font-semibold uppercase tracking-widest">
          {revealed ? "Resposta" : "Frente"}
        </div>
        <div className="mt-4 text-2xl font-semibold leading-snug">
          {revealed ? card.back : card.front}
        </div>
        {!revealed && card.hint && (
          <div className="text-text-muted mt-6 text-sm">Pista: {card.hint}</div>
        )}
      </button>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => move(-1)}
          className="border-border-strong hover:bg-surface-2 inline-flex size-10 items-center justify-center rounded-md border"
          aria-label="Cartao anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
          style={{ background: tenant.primary, color: tenant.primaryFg }}
        >
          <RefreshCw size={15} />
          Virar cartão
        </button>
        <div className="text-text-faint text-sm">
          {index + 1}/{content.cards.length}
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          className="border-border-strong hover:bg-surface-2 inline-flex size-10 items-center justify-center rounded-md border"
          aria-label="Proximo cartao"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function QuizViewer({
  content,
  tenant,
}: {
  content: Extract<StudentArtifactContent, { kind: "quiz" }>;
  tenant: Props["tenant"];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const question = content.questions[index] ?? content.questions[0];
  const selected = answers[index];
  const score = useMemo(
    () =>
      content.questions.reduce(
        (sum, item, itemIndex) =>
          answers[itemIndex] === item.correctIndex ? sum + 1 : sum,
        0,
      ),
    [answers, content.questions],
  );
  if (!question) return null;

  return (
    <div className="min-h-[430px]">
      <div className="border-border bg-surface-2 rounded-lg border p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-text-faint text-xs font-semibold uppercase tracking-widest">
            Questão {index + 1}/{content.questions.length}
          </div>
          <div className="text-text-muted text-sm">
            Acertos: {score}/{content.questions.length}
          </div>
        </div>
        <div className="mt-3 text-xl font-semibold leading-snug">
          {question.question}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {question.options.map((option, optionIndex) => {
          const answered = selected !== undefined;
          const correct = optionIndex === question.correctIndex;
          const picked = selected === optionIndex;
          return (
            <button
              key={`${option}-${optionIndex}`}
              type="button"
              onClick={() =>
                setAnswers((prev) => ({ ...prev, [index]: optionIndex }))
              }
              className={cn(
                "border-border-strong bg-surface hover:bg-surface-2 flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                answered && correct && "border-success bg-success-soft",
                answered && picked && !correct && "border-danger bg-danger-soft",
              )}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  background: tenant.primarySoft,
                  color: tenant.primary,
                }}
              >
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="flex-1">{option}</span>
              {answered && correct && <CheckCircle2 size={16} />}
            </button>
          );
        })}
      </div>

      {selected !== undefined && (
        <div className="bg-info-soft text-text mt-4 rounded-lg p-4 text-sm leading-relaxed">
          {question.explanation}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() =>
            setIndex((prev) => (prev + 1) % content.questions.length)
          }
          className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
          style={{ background: tenant.primary, color: tenant.primaryFg }}
        >
          Próxima
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function SummaryViewer({
  content,
}: {
  content: Extract<StudentArtifactContent, { kind: "summary" }>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
      <div className="border-border bg-surface-2 rounded-lg border p-5">
        <div className="text-text-faint text-xs font-semibold uppercase tracking-widest">
          Resumo
        </div>
        <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">
          {content.summary}
        </p>
        {content.practicePrompt && (
          <div className="border-border bg-surface mt-5 rounded-lg border p-4">
            <div className="text-sm font-semibold">Pergunta de treino</div>
            <div className="text-text-muted mt-1 text-sm">
              {content.practicePrompt}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <section className="border-border rounded-lg border p-4">
          <div className="text-sm font-semibold">Pontos-chave</div>
          <ul className="mt-3 space-y-2 text-sm">
            {content.keyPoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border rounded-lg border p-4">
          <div className="text-sm font-semibold">Passos de estudo</div>
          <ol className="mt-3 space-y-2 text-sm">
            {content.studySteps.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="text-text-faint w-5 shrink-0 font-mono">
                  {index + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function EmptyArtifactState({ tenant }: { tenant: Props["tenant"] }) {
  return (
    <div className="border-border flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center">
      <div
        className="flex size-12 items-center justify-center rounded-lg"
        style={{ background: tenant.primarySoft, color: tenant.primary }}
      >
        <Sparkles size={21} />
      </div>
      <div className="mt-4 text-base font-semibold">
        Escolha um formato e gere seu material
      </div>
      <p className="text-text-muted mt-2 max-w-sm text-sm">
        Use um tema ou a conversa aberta para criar uma revisão curta.
      </p>
    </div>
  );
}

function kindLabel(kind: StudentArtifactKind): string {
  if (kind === "flashcards") return "Cartões";
  if (kind === "quiz") return "Quiz";
  return "Resumo";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
