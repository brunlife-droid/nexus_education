import { NextResponse, type NextRequest } from "next/server";
import { complete } from "@/lib/llm";
import {
  buildFocusBlock,
  buildMaterialContext,
  type MaterialContext,
} from "@/lib/llm/rag/context";
import { getCurrentTenant } from "@/lib/tenants/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import {
  resolveStudentId,
  resolveStudentClassId,
} from "@/lib/db/student-resolver";
import {
  createConversation,
  appendMessage,
  touchConversation,
  getConversationOwner,
} from "@/lib/chat/persistence";
import type { MediaMessageAttachment } from "@/lib/chat/persistence";
import {
  normalizeIncomingMessages,
  prepareChatPayload,
} from "@/lib/chat/multimodal";
import { createBufferedSseResponse } from "@/lib/http/sse";

/**
 * POST /api/chat
 *
 * Body: {
 *   messages: ChatMessage[],
 *   conversationId?: string  // se ausente, cria nova conversation
 * }
 *
 * Responde em linhas SSE com chunks
 * { type: "text" | "done" | "error" | "meta" | "sources" }.
 * O chunk "meta" carrega { conversationId } pra o cliente atualizar a URL.
 *
 * Persistência é graceful: sem DATABASE_URL, o chat continua streamando
 * mas não salva no DB.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "aluno" && session.user.role !== "responsavel") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tenant = await getCurrentTenant();
  const body = (await request.json()) as {
    messages?: unknown;
    conversationId?: string;
  };
  const incomingMessages = normalizeIncomingMessages(body.messages);

  if (incomingMessages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const studentId = await resolveStudentId({
    userId: session.user.id,
    tenantId: tenant.id,
  });

  let conversationId: string | null = body.conversationId ?? null;
  if (conversationId && studentId) {
    const owner = await getConversationOwner({
      tenantId: tenant.id,
      conversationId,
    });
    if (!owner || owner.studentId !== studentId) {
      conversationId = null;
    }
  }

  const lastUserMessage = [...incomingMessages]
    .reverse()
    .find((m) => m.role === "user");
  const prepared = await prepareChatPayload(incomingMessages);

  if (!conversationId && studentId && lastUserMessage) {
    conversationId = await createConversation({
      tenantId: tenant.id,
      studentId,
      title: conversationTitle(lastUserMessage),
    });
  }

  if (conversationId && lastUserMessage) {
    await appendMessage({
      tenantId: tenant.id,
      conversationId,
      role: "user",
      content: lastUserMessage.content || conversationTitle(lastUserMessage),
      attachments:
        prepared.lastUserAttachments.length > 0
          ? prepared.lastUserAttachments
          : undefined,
    });
    await writeChatAttachmentAudit({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      studentId,
      conversationId,
      attachments: prepared.lastUserAttachments,
    });
  }

  const persistedConversationId = conversationId;

  const events: unknown[] = [];
  if (persistedConversationId) {
    events.push({ type: "meta", conversationId: persistedConversationId });
  }

  try {
    // RAG: foco pedagógico da turma + trechos relevantes do material.
    // Resiliente — se algo falhar, slots vêm com placeholder neutro.
    const classId = studentId
      ? await resolveStudentClassId({ studentId })
      : null;

    const lastUserText = prepared.ragQuery || lastUserMessage?.content || "";
    let focoBlock = "(Nenhuma habilidade marcada como foco no momento.)";
    let materialContext: MaterialContext = {
      block:
        "(Sem material relevante encontrado para essa pergunta. Responda com seu conhecimento amplo.)",
      sources: [],
    };

    if (classId) {
      [focoBlock, materialContext] = await Promise.all([
        buildFocusBlock({ tenantId: tenant.id, classId }),
        buildMaterialContext({
          tenantId: tenant.id,
          classId,
          query: lastUserText,
        }),
      ]);
    }

    const result = await complete({
      capability: "chat_student",
      messages: prepared.messages,
      tenantId: tenant.id,
      systemContext: {
        tutor_name: tenant.tutorName,
        prefeitura: tenant.short,
        foco_pedagogico: focoBlock,
        contexto_material: materialContext.block,
      },
    });

    events.push({ type: "text", text: result.text });
    if (materialContext.sources.length > 0) {
      events.push({ type: "sources", sources: materialContext.sources });
    }
    events.push({
      type: "done",
      meta: {
        model: result.model,
        provider: result.provider,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      },
    });

    if (persistedConversationId && result.text) {
      const sourceAttachments = materialContext.sources.map((source) => ({
        kind: "source" as const,
        ...source,
      }));
      await appendMessage({
        tenantId: tenant.id,
        conversationId: persistedConversationId,
        role: "assistant",
        content: result.text,
        attachments: sourceAttachments.length > 0 ? sourceAttachments : undefined,
        model: result.model,
        promptVersion: result.promptVersion,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      });
      await touchConversation({
        tenantId: tenant.id,
        conversationId: persistedConversationId,
      });
    }
  } catch (err) {
    events.push({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return createBufferedSseResponse(events);
}

function conversationTitle(message: {
  content: string;
  attachments?: Array<{ kind: string; name?: string }>;
}): string {
  const text = message.content.trim();
  if (text) return text;
  const first = message.attachments?.[0];
  if (!first) return "Conversa com a tutora";
  if (first.kind === "image") return `Imagem para estudar: ${first.name ?? "foto"}`;
  if (first.kind === "audio") return `Audio para estudar: ${first.name ?? "audio"}`;
  return `Documento para estudar: ${first.name ?? "arquivo"}`;
}

async function writeChatAttachmentAudit(input: {
  tenantId: string;
  actorUserId: string;
  studentId: string | null;
  conversationId: string | null;
  attachments: MediaMessageAttachment[];
}) {
  if (!process.env.DATABASE_URL || input.attachments.length === 0) return;
  try {
    await db().insert(auditLog).values({
      tenantId: input.tenantId,
      actorUserId: null,
      action: "student.chat.attachment_analyze",
      targetType: "conversation",
      targetId: input.conversationId ?? input.studentId ?? null,
      metadata: {
        actorUserId: input.actorUserId,
        studentId: input.studentId,
        conversationId: input.conversationId,
        attachments: input.attachments.map((attachment) => ({
          kind: attachment.kind,
          mime: attachment.mime,
          name: attachment.name,
          size: attachment.size,
          hasTranscript: !!attachment.transcript,
          hasExtractedText: !!attachment.extractedText,
          analysisError: attachment.analysisError,
        })),
      },
    });
  } catch (err) {
    console.warn("[chat] attachment audit failed:", err);
  }
}
