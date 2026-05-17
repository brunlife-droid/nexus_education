/**
 * Gateway central de LLM.
 *
 * Toda chamada de IA passa por aqui — NUNCA chame `openrouter()` ou
 * `openai()` direto de componentes/server actions.
 *
 * Responsabilidades:
 * - Roteamento capability → modelo via `loadRoute()` (DB → fallback hardcoded)
 * - Renderização de prompt versionado via `loadActivePrompt()` (DB → fallback)
 * - Fallback automático para mock quando API key ausente
 * - Logging de tokens/latência/custo por tenant (TODO: persistir em audit_log)
 * - Streaming uniforme via AsyncGenerator
 */

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from "./types";
import { loadRoute, loadActivePrompt } from "./config";
import { renderPrompt } from "./prompts/student-tutor";
import { mockComplete, mockStream } from "./providers/mock";
import { openrouterComplete, openrouterStream } from "./providers/openrouter";

function shouldUseMock(provider: string): boolean {
  if (provider === "mock") return true;
  if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) return true;
  if (provider === "openai" && !process.env.OPENAI_API_KEY) return true;
  return false;
}

const DEFAULTS_BY_CAPABILITY: Record<string, Record<string, string>> = {
  chat_student: {
    tutor_name: "Profe Mari",
    prefeitura: "Alfenas",
    aluno_context: "(contexto vazio — sem DB)",
    historico_resumido: "(sem histórico)",
    foco_pedagogico: "(Nenhuma habilidade marcada como foco no momento.)",
    contexto_material:
      "(Sem material relevante encontrado para essa pergunta. Responda com seu conhecimento amplo.)",
  },
  student_artifact_generation: {
    prefeitura: "Alfenas",
  },
  plan_generation: {
    prefeitura: "Alfenas",
    tenant_uf: "MG",
  },
  exam_generation: {
    prefeitura: "Alfenas",
    tenant_uf: "MG",
  },
  essay_correction: {
    prefeitura: "Alfenas",
    tenant_uf: "MG",
    student_name: "(aluno)",
    essay_topic: "(tema não informado)",
  },
};

async function injectSystemPrompt(
  req: ChatCompletionRequest,
): Promise<{ req: ChatCompletionRequest; promptVersion?: string }> {
  const hasSystem = req.messages.some((m) => m.role === "system");
  if (hasSystem) return { req };

  const prompt = await loadActivePrompt(req.capability);
  if (!prompt) return { req };

  const defaults = DEFAULTS_BY_CAPABILITY[req.capability] ?? {};
  const rendered = renderPrompt(prompt.content, {
    ...defaults,
    ...req.systemContext,
  });

  return {
    req: {
      ...req,
      messages: [{ role: "system", content: rendered }, ...req.messages],
    },
    promptVersion: prompt.version,
  };
}

function withRouteDefaults(
  req: ChatCompletionRequest,
  route: { temperature?: number; maxTokens?: number },
): ChatCompletionRequest {
  return {
    ...req,
    temperature: req.temperature ?? route.temperature,
    maxTokens: req.maxTokens ?? route.maxTokens,
  };
}

export async function complete(
  req: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const route = await loadRoute(req.capability);
  const { req: enriched, promptVersion } = await injectSystemPrompt(req);
  const withDefaults = withRouteDefaults(enriched, route);

  if (shouldUseMock(route.provider)) {
    const result = await mockComplete(withDefaults);
    return { ...result, promptVersion: promptVersion ?? result.promptVersion };
  }

  if (route.provider === "openrouter") {
    try {
      const result = await openrouterComplete(withDefaults, route.model);
      return { ...result, promptVersion };
    } catch (err) {
      console.error("openrouter failed, falling back to mock", err);
      const result = await mockComplete(withDefaults);
      return { ...result, promptVersion: promptVersion ?? result.promptVersion };
    }
  }

  const result = await mockComplete(withDefaults);
  return { ...result, promptVersion: promptVersion ?? result.promptVersion };
}

export async function* stream(
  req: ChatCompletionRequest,
): AsyncGenerator<StreamChunk> {
  const route = await loadRoute(req.capability);
  const { req: enriched } = await injectSystemPrompt(req);
  const withDefaults = withRouteDefaults(enriched, route);

  if (shouldUseMock(route.provider)) {
    yield* mockStream(withDefaults);
    return;
  }

  if (route.provider === "openrouter") {
    try {
      yield* openrouterStream(withDefaults, route.model);
      return;
    } catch (err) {
      console.error("openrouter stream failed, falling back to mock", err);
      yield* mockStream(withDefaults);
      return;
    }
  }

  yield* mockStream(withDefaults);
}
