/**
 * Gateway central de LLM.
 *
 * Toda chamada de IA passa por aqui — NUNCA chame `anthropic()` ou
 * `openai()` direto de componentes/server actions.
 *
 * Responsabilidades:
 * - Roteamento capability → modelo via tabela (routes.ts)
 * - Renderização de prompts versionados com contexto do tenant/aluno
 * - Fallback automático para mock quando API key ausente
 * - Logging de tokens/latência/custo por tenant (TODO: persistir em audit_log)
 * - Streaming uniforme via AsyncGenerator
 */

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from "./types";
import { routeFor } from "./routes";
import { STUDENT_TUTOR_PROMPT, renderPrompt } from "./prompts/student-tutor";
import { mockComplete, mockStream } from "./providers/mock";
import { anthropicComplete, anthropicStream } from "./providers/anthropic";

function shouldUseMock(provider: string): boolean {
  if (provider === "mock") return true;
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) return true;
  if (provider === "openai" && !process.env.OPENAI_API_KEY) return true;
  return false;
}

function injectSystemPrompt(
  req: ChatCompletionRequest,
): ChatCompletionRequest {
  if (req.capability !== "chat_student") return req;
  const hasSystem = req.messages.some((m) => m.role === "system");
  if (hasSystem) return req;
  const rendered = renderPrompt(STUDENT_TUTOR_PROMPT.content, {
    tutor_name: "Profe Mari",
    prefeitura: "Alfenas",
    aluno_context: "(contexto vazio na Fase 0 — sem DB)",
    historico_resumido: "(sem histórico)",
    ...req.systemContext,
  });
  return {
    ...req,
    messages: [{ role: "system", content: rendered }, ...req.messages],
  };
}

export async function complete(
  req: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const route = routeFor(req.capability);
  const enriched = injectSystemPrompt(req);

  if (shouldUseMock(route.provider)) {
    return mockComplete(enriched);
  }

  if (route.provider === "anthropic") {
    try {
      return await anthropicComplete(enriched, route.model);
    } catch (err) {
      console.error("anthropic failed, falling back to mock", err);
      return mockComplete(enriched);
    }
  }

  // outros providers (openai, google) ainda não implementados — caem no mock
  return mockComplete(enriched);
}

export async function* stream(
  req: ChatCompletionRequest,
): AsyncGenerator<StreamChunk> {
  const route = routeFor(req.capability);
  const enriched = injectSystemPrompt(req);

  if (shouldUseMock(route.provider)) {
    yield* mockStream(enriched);
    return;
  }

  if (route.provider === "anthropic") {
    try {
      yield* anthropicStream(enriched, route.model);
      return;
    } catch (err) {
      console.error("anthropic stream failed, falling back to mock", err);
      yield* mockStream(enriched);
      return;
    }
  }

  yield* mockStream(enriched);
}
