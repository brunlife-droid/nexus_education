import type { CapabilityRoute } from "./types";

/**
 * Tabela de roteamento de capabilities → modelos.
 *
 * Em produção, isso virá do DB (tabela `llm_routes`) e poderá ser
 * alterado pelo painel N7 sem deploy. Aqui é hard-coded para Fase 0.
 *
 * Estratégia:
 * - claude-haiku-4-5 como modelo primário (rápido, barato, multilíngue forte em PT-BR)
 * - gpt-4o-mini para correção de redação (melhor em norma culta)
 * - text-embedding-3-small para RAG (custo/qualidade razoável)
 */

export const ROUTES: CapabilityRoute[] = [
  {
    capability: "chat_student",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    promptVersion: "v4.2",
    fallback: { provider: "google", model: "gemini-2.5-flash" },
  },
  {
    capability: "plan_generation",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    promptVersion: "v1.0",
  },
  {
    capability: "essay_correction",
    provider: "openai",
    model: "gpt-4o-mini",
    promptVersion: "v1.0",
    fallback: { provider: "anthropic", model: "claude-haiku-4-5" },
  },
  {
    capability: "bncc_classification",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    promptVersion: "v1.0",
  },
  {
    capability: "sre_classification",
    provider: "anthropic",
    model: "claude-haiku-4-5",
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
