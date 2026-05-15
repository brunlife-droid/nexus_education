/**
 * Gateway central de LLM.
 *
 * Toda chamada de IA passa por aqui — NUNCA chame `openrouter()` ou
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
import { LESSON_PLAN_PROMPT } from "./prompts/lesson-plan";
import { mockComplete, mockStream } from "./providers/mock";
import { openrouterComplete, openrouterStream } from "./providers/openrouter";

function shouldUseMock(provider: string): boolean {
  if (provider === "mock") return true;
  if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) return true;
  if (provider === "openai" && !process.env.OPENAI_API_KEY) return true;
  return false;
}

function injectSystemPrompt(
  req: ChatCompletionRequest,
): ChatCompletionRequest {
  const hasSystem = req.messages.some((m) => m.role === "system");
  if (hasSystem) return req;

  let rendered: string | null = null;
  if (req.capability === "chat_student") {
    rendered = renderPrompt(STUDENT_TUTOR_PROMPT.content, {
      tutor_name: "Profe Mari",
      prefeitura: "Alfenas",
      aluno_context: "(contexto vazio na Fase 0 — sem DB)",
      historico_resumido: "(sem histórico)",
      ...req.systemContext,
    });
  } else if (req.capability === "plan_generation") {
    rendered = renderPrompt(LESSON_PLAN_PROMPT.content, {
      prefeitura: "Alfenas",
      tenant_uf: "MG",
      ...req.systemContext,
    });
  }

  if (!rendered) return req;
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

  if (route.provider === "openrouter") {
    try {
      return await openrouterComplete(enriched, route.model);
    } catch (err) {
      console.error("openrouter failed, falling back to mock", err);
      return mockComplete(enriched);
    }
  }

  // Outros providers (ex: openai direto para embeddings) podem ser
  // implementados aqui no futuro. Por ora, caem no mock.
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

  if (route.provider === "openrouter") {
    try {
      yield* openrouterStream(enriched, route.model);
      return;
    } catch (err) {
      console.error("openrouter stream failed, falling back to mock", err);
      yield* mockStream(enriched);
      return;
    }
  }

  yield* mockStream(enriched);
}
