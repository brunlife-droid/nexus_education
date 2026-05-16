import { NextResponse, type NextRequest } from "next/server";
import { complete } from "@/lib/llm";
import { routeFor } from "@/lib/llm/routes";
import { auth } from "@/lib/auth";
import type { Capability } from "@/lib/llm/types";

/**
 * GET /api/llm-health
 *
 * Faz uma chamada mínima ao LLM e retorna metadata real (provider, model,
 * latência, tokens) — útil pra confirmar se OPENROUTER_API_KEY está válida
 * em produção sem precisar parsear a resposta do chat/copiloto.
 *
 * Exige sessão. Disponível pra qualquer papel logado.
 */

export const runtime = "nodejs";

const HEALTH_CAPABILITIES = new Set<Capability>([
  "chat_student",
  "plan_generation",
  "exam_generation",
  "essay_correction",
]);

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requestedCapability = request.nextUrl.searchParams.get("capability");
  const capability = HEALTH_CAPABILITIES.has(requestedCapability as Capability)
    ? (requestedCapability as Capability)
    : "chat_student";
  const expectedRoute = routeFor(capability);
  const hasApiKey = !!process.env.OPENROUTER_API_KEY;

  const start = Date.now();
  try {
    const result = await complete({
      capability,
      messages: [
        {
          role: "user",
          content: healthPromptFor(capability),
        },
      ],
      tenantId: session.user.tenantId ?? "alfenas",
      maxTokens: capability === "chat_student" ? 16 : 160,
    });

    const isReal = result.provider === "openrouter";

    return NextResponse.json({
      ok: true,
      live: isReal,
      capability,
      provider: result.provider,
      model: result.model,
      expectedModel: expectedRoute.model,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      sample: result.text.slice(0, 200),
      env: {
        hasOpenRouterKey: hasApiKey,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      },
      hint: isReal
        ? "Provider real respondeu — OpenRouter está ligado."
        : "Caiu no mock. Verifique OPENROUTER_API_KEY na Vercel e refaça redeploy.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        capability,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
        env: {
          hasOpenRouterKey: hasApiKey,
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        },
      },
      { status: 500 },
    );
  }
}

function healthPromptFor(capability: Capability): string {
  if (capability === "plan_generation") {
    return "Gere um plano curto de aula sobre frações equivalentes para 7º ano. Limite a 5 linhas.";
  }
  if (capability === "exam_generation") {
    return "Gere uma prova curta de 2 questões sobre frações equivalentes para 7º ano. Limite a 8 linhas.";
  }
  if (capability === "essay_correction") {
    return "Corrija brevemente esta redação: tecnologia ajuda a estudar, mas precisa de orientação. Limite a 5 linhas.";
  }
  return "Responda apenas 'pong' (sem aspas, sem nada a mais).";
}
