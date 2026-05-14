import { NextResponse, type NextRequest } from "next/server";
import { stream } from "@/lib/llm";
import { getCurrentTenant } from "@/lib/tenants/server";

/**
 * POST /api/chat
 *
 * Body: { messages: ChatMessage[] }
 *
 * Retorna text/event-stream com o conteúdo gerado em chunks.
 * Quando não há ANTHROPIC_API_KEY, cai automaticamente no mock provider
 * (resposta plausível com latência simulada).
 */

export const runtime = "nodejs"; // node, não edge, por causa do AI SDK + drizzle (futuro)

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant();
  const body = (await request.json()) as {
    messages: { role: "user" | "assistant" | "system"; content: string }[];
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(controller) {
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
          const payload = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          if (chunk.type === "done" || chunk.type === "error") break;
        }
      } catch (err) {
        const errPayload = JSON.stringify({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
        controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
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
