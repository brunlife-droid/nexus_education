import type { CapabilityRoute } from "./types";

/**
 * Tabela de roteamento de capabilities → modelos.
 *
 * Em produção, isso virá do DB (tabela `llm_routes`) e poderá ser
 * alterado pelo painel N7 sem deploy. Aqui é hard-coded para Fase 0.
 *
 * Estratégia:
 * - OpenRouter como provider único para chat/geração — acesso a Claude,
 *   GPT, Gemini e Llama com a mesma API key (custo centralizado).
 * - claude-haiku-4-5 como modelo primário (rápido, barato, forte em PT-BR).
 * - gpt-4o-mini para correção de redação (norma culta).
 * - Fallbacks cruzados para resiliência (se Anthropic cai, Gemini assume).
 * - Embeddings continuam direto na OpenAI (OpenRouter não roda embeddings).
 */

export const ROUTES: CapabilityRoute[] = [
  {
    capability: "chat_student",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    promptVersion: "v4.3",
    fallback: { provider: "openrouter", model: "google/gemini-2.5-flash" },
  },
  {
    capability: "student_artifact_generation",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    promptVersion: "v1.0",
    fallback: { provider: "openrouter", model: "google/gemini-2.5-flash" },
  },
  {
    capability: "plan_generation",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    promptVersion: "v1.0",
  },
  {
    capability: "exam_generation",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    promptVersion: "v1.0",
    fallback: { provider: "openrouter", model: "google/gemini-2.5-flash" },
  },
  {
    capability: "essay_correction",
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    promptVersion: "v1.0",
    fallback: { provider: "openrouter", model: "anthropic/claude-haiku-4-5" },
  },
  {
    capability: "bncc_classification",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    promptVersion: "v1.0",
  },
  {
    capability: "sre_classification",
    provider: "openrouter",
    model: "anthropic/claude-haiku-4-5",
    promptVersion: "v1.0",
  },
  {
    capability: "embeddings_rag",
    provider: "openai",
    model: "text-embedding-3-small",
  },
];

export function routeFor(
  capability: CapabilityRoute["capability"],
): CapabilityRoute {
  const route = ROUTES.find((r) => r.capability === capability);
  if (!route) {
    throw new Error(`No route configured for capability: ${capability}`);
  }
  return route;
}
