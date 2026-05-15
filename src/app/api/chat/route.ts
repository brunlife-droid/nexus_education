import { NextResponse, type NextRequest } from "next/server";
import { stream } from "@/lib/llm";
import { getCurrentTenant } from "@/lib/tenants/server";
import { ensureDemoStudent } from "@/lib/db/seed-demo";
import {
  createConversation,
  appendMessage,
  touchConversation,
  getConversationOwner,
} from "@/lib/chat/persistence";

/**
 * POST /api/chat
 *
 * Body: {
 *   messages: ChatMessage[],
 *   conversationId?: string  // se ausente, cria nova conversation
 * }
 *
 * Stream SSE com chunks { type: "text" | "done" | "error" | "meta" }.
 * O chunk "meta" carrega { conversationId } pra o cliente atualizar a URL.
 *
 * Persistência é graceful: sem DATABASE_URL, o chat continua streamando
 * mas não salva no DB.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant();
  const body = (await request.json()) as {
    messages: { role: "user" | "assistant" | "system"; content: string }[];
    conversationId?: string;
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const studentId = await ensureDemoStudent();

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

  const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user");

  if (!conversationId && studentId && lastUserMessage) {
    conversationId = await createConversation({
      tenantId: tenant.id,
      studentId,
      title: lastUserMessage.content,
    });
  }

  if (conversationId && lastUserMessage) {
    await appendMessage({
      tenantId: tenant.id,
      conversationId,
      role: "user",
      content: lastUserMessage.content,
    });
  }

  const persistedConversationId = conversationId;

  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      if (persistedConversationId) {
        send({ type: "meta", conversationId: persistedConversationId });
      }

      let accumulated = "";
      let assistantMeta: {
        model?: string;
        promptVersion?: string;
        inputTokens?: number;
        outputTokens?: number;
        latencyMs?: number;
      } = {};

      try {
        for await (const chunk of stream({
          capability: "chat_student",
          messages: body.messages,
          tenantId: tenant.id,
          systemContext: {
            tutor_name: tenant.tutorName,
            prefeitura: tenant.short,
          },
        })) {
          if (chunk.type === "text" && chunk.text) {
            accumulated += chunk.text;
          }
          if (chunk.type === "done" && chunk.meta) {
            assistantMeta = {
              model: chunk.meta.model,
              promptVersion: chunk.meta.promptVersion,
              inputTokens: chunk.meta.inputTokens,
              outputTokens: chunk.meta.outputTokens,
              latencyMs: chunk.meta.latencyMs,
            };
          }
          send(chunk);
          if (chunk.type === "done" || chunk.type === "error") break;
        }

        if (persistedConversationId && accumulated) {
          await appendMessage({
            tenantId: tenant.id,
            conversationId: persistedConversationId,
            role: "assistant",
            content: accumulated,
            ...assistantMeta,
          });
          await touchConversation({
            tenantId: tenant.id,
            conversationId: persistedConversationId,
          });
        }
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
