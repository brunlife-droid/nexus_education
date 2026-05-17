import { NextResponse, type NextRequest } from "next/server";
import { complete } from "@/lib/llm";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenants/server";
import { resolveStudentId } from "@/lib/db/student-resolver";
import {
  getConversationOwner,
  loadMessages,
  type MessageAttachment,
  type PersistedMessage,
} from "@/lib/chat/persistence";
import {
  recordStudentArtifact,
  type FlashcardItem,
  type QuizQuestion,
  type StudentArtifact,
  type StudentArtifactContent,
  type StudentArtifactKind,
} from "@/lib/student/artifacts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "aluno" && session.user.role !== "responsavel") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    topic?: string;
    conversationId?: string;
  };
  const kind = normalizeKind(body.kind);
  if (!kind) {
    return NextResponse.json({ error: "kind invalido" }, { status: 400 });
  }

  const tenant = await getCurrentTenant();
  const studentId = await resolveStudentId({
    userId: session.user.id,
    tenantId: tenant.id,
  });

  const source = await buildSourceContext({
    tenantId: tenant.id,
    studentId,
    conversationId: body.conversationId,
    topic: body.topic,
  });
  if (!source.context.trim()) {
    return NextResponse.json(
      { error: "Informe um tema ou gere a partir de uma conversa." },
      { status: 400 },
    );
  }

  const result = await complete({
    capability: "student_artifact_generation",
    tenantId: tenant.id,
    temperature: 0.3,
    maxTokens: 1800,
    systemContext: {
      prefeitura: tenant.short,
    },
    messages: [
      {
        role: "user",
        content: artifactPrompt({
          kind,
          topic: source.title,
          context: source.context,
        }),
      },
    ],
  });

  const generated = parseGeneratedArtifact(result.text, kind, source.title);
  const artifactId = await recordStudentArtifact({
    tenantId: tenant.id,
    actorUserId: session.user.id,
    studentId,
    kind,
    title: generated.title,
    content: generated.content,
    request: {
      topic: body.topic,
      conversationId: body.conversationId,
      source: source.kind,
    },
    result,
  });

  const artifact: StudentArtifact = {
    id: artifactId ?? `temp-${Date.now()}`,
    kind,
    title: generated.title,
    content: generated.content,
    provider: result.provider,
    model: result.model,
    createdAt: new Date(),
  };

  return NextResponse.json({ ok: true, artifact });
}

async function buildSourceContext(input: {
  tenantId: string;
  studentId: string | null;
  conversationId?: string;
  topic?: string;
}): Promise<{ kind: "conversation" | "topic"; title: string; context: string }> {
  const topic = input.topic?.trim() ?? "";
  if (input.conversationId && input.studentId) {
    const owner = await getConversationOwner({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
    });
    if (owner?.studentId === input.studentId) {
      const messages = await loadMessages({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
      });
      const context = conversationContext(messages);
      if (context.trim()) {
        return {
          kind: "conversation",
          title: topic || "Conversa recente com a tutora",
          context,
        };
      }
    }
  }

  return {
    kind: "topic",
    title: topic || "Estudo guiado",
    context: topic,
  };
}

function conversationContext(messages: PersistedMessage[]): string {
  return messages
    .slice(-12)
    .map((message) => {
      const role = message.role === "assistant" ? "Tutora" : "Aluno";
      const attachments = attachmentText(message.attachments);
      return `${role}: ${message.content}${attachments ? `\n${attachments}` : ""}`;
    })
    .join("\n\n")
    .slice(0, 12000);
}

function attachmentText(attachments: MessageAttachment[] | null): string {
  if (!attachments || attachments.length === 0) return "";
  return attachments
    .map((attachment) => {
      if (attachment.kind === "source") {
        return `Fonte usada: ${attachment.documentName}, trecho ${attachment.chunkIndex + 1}.`;
      }
      if (attachment.transcript) return `Transcricao de audio: ${attachment.transcript}`;
      if (attachment.extractedText) {
        return `Texto extraido do documento: ${attachment.extractedText}`;
      }
      return `Anexo enviado: ${attachment.kind} ${attachment.name ?? ""}`.trim();
    })
    .join("\n");
}

function artifactPrompt(input: {
  kind: StudentArtifactKind;
  topic: string;
  context: string;
}): string {
  return [
    `kind="${input.kind}"`,
    `Tema/titulo de referencia: ${input.topic}`,
    "",
    "Contexto para transformar em material de estudo:",
    input.context,
  ].join("\n");
}

function parseGeneratedArtifact(
  text: string,
  kind: StudentArtifactKind,
  topic: string,
): { title: string; content: StudentArtifactContent } {
  const parsed = parseJsonObject(text);
  const normalized = parsed ? normalizeGenerated(parsed, kind) : null;
  if (normalized) return normalized;
  return fallbackArtifact(kind, topic);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(withoutFence.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function normalizeGenerated(
  raw: Record<string, unknown>,
  kind: StudentArtifactKind,
): { title: string; content: StudentArtifactContent } | null {
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : defaultTitle(kind);

  if (kind === "flashcards") {
    const cards = Array.isArray(raw.cards)
      ? raw.cards
          .map(normalizeFlashcard)
          .filter((item): item is FlashcardItem => !!item)
          .slice(0, 10)
      : [];
    return cards.length > 0
      ? { title, content: { kind, cards } }
      : null;
  }

  if (kind === "quiz") {
    const questions = Array.isArray(raw.questions)
      ? raw.questions
          .map(normalizeQuestion)
          .filter((item): item is QuizQuestion => !!item)
          .slice(0, 8)
      : [];
    return questions.length > 0
      ? { title, content: { kind, questions } }
      : null;
  }

  const summary = stringValue(raw.summary);
  const keyPoints = stringList(raw.keyPoints).slice(0, 8);
  const studySteps = stringList(raw.studySteps).slice(0, 6);
  const practicePrompt = stringValue(raw.practicePrompt);
  if (!summary && keyPoints.length === 0) return null;
  return {
    title,
    content: {
      kind,
      summary,
      keyPoints,
      studySteps,
      practicePrompt,
    },
  };
}

function normalizeFlashcard(value: unknown): FlashcardItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const front = stringValue(raw.front);
  const back = stringValue(raw.back);
  if (!front || !back) return null;
  return {
    front,
    back,
    hint: stringValue(raw.hint) || undefined,
  };
}

function normalizeQuestion(value: unknown): QuizQuestion | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const question = stringValue(raw.question);
  const options = stringList(raw.options).slice(0, 4);
  const correctIndex =
    typeof raw.correctIndex === "number" ? Math.round(raw.correctIndex) : 0;
  if (!question || options.length < 2) return null;
  return {
    question,
    options,
    correctIndex:
      correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0,
    explanation: stringValue(raw.explanation),
  };
}

function fallbackArtifact(
  kind: StudentArtifactKind,
  topic: string,
): { title: string; content: StudentArtifactContent } {
  const subject = topic || "tema estudado";
  if (kind === "flashcards") {
    return {
      title: `Cartoes - ${subject}`,
      content: {
        kind,
        cards: [
          {
            front: `Qual e a ideia central de ${subject}?`,
            back: "Explique com suas palavras antes de conferir no material.",
            hint: "Procure a primeira definicao ou exemplo da conversa.",
          },
          {
            front: "Que exemplo ajuda a entender esse tema?",
            back: "Use um exemplo do cotidiano ou um exercicio parecido.",
            hint: "Pense em uma situacao real.",
          },
          {
            front: "Qual erro comum devo evitar?",
            back: "Confundir a regra com a resposta pronta. Mostre o raciocinio.",
            hint: "Revise o passo que mais trava.",
          },
        ],
      },
    };
  }
  if (kind === "quiz") {
    return {
      title: `Quiz - ${subject}`,
      content: {
        kind,
        questions: [
          {
            question: `Antes de resolver ${subject}, qual e o melhor primeiro passo?`,
            options: [
              "Ler o enunciado com calma",
              "Chutar a resposta",
              "Copiar a resposta final",
              "Ignorar os dados",
            ],
            correctIndex: 0,
            explanation:
              "Ler com calma ajuda a identificar o que a questao realmente pede.",
          },
        ],
      },
    };
  }
  return {
    title: `Resumo - ${subject}`,
    content: {
      kind,
      summary:
        "Organize o tema em conceito, exemplo e uma pergunta de treino. Se faltou contexto, confira o material da professora antes da prova.",
      keyPoints: ["Conceito principal", "Exemplo resolvido", "Erro comum"],
      studySteps: [
        "Releia a explicacao",
        "Resolva um exemplo parecido",
        "Explique o raciocinio em voz alta",
      ],
      practicePrompt: `Explique ${subject} com suas palavras em 3 linhas.`,
    },
  };
}

function normalizeKind(value: unknown): StudentArtifactKind | null {
  if (value === "flashcards" || value === "quiz" || value === "summary") {
    return value;
  }
  return null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(stringValue).filter(Boolean)
    : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function defaultTitle(kind: StudentArtifactKind): string {
  if (kind === "flashcards") return "Cartoes de estudo";
  if (kind === "quiz") return "Quiz de revisao";
  return "Resumo guiado";
}
