/**
 * Loader de configuração LLM (DB → fallback hardcoded).
 *
 * O gateway consulta este módulo a cada chamada (cacheado por request via
 * React `cache()`) pra decidir:
 *   - qual modelo usar (capability → provider/model/temperature/maxTokens)
 *   - qual system prompt injetar (capability → conteúdo + versão)
 *
 * Edição no admin (`/admin/configuracoes/llm`) atualiza as tabelas
 * `llm_routes` e `system_prompts` — efeito imediato no próximo request,
 * sem deploy.
 *
 * Resiliência: se DATABASE_URL ausente OU a query falhar, cai pro
 * `ROUTES`/`*_PROMPT` hardcoded em `routes.ts` / `prompts/*.ts`.
 */

import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { llmRoutes, systemPrompts } from "@/lib/db/schema";
import { routeFor as routeForHardcoded } from "./routes";
import { STUDENT_TUTOR_PROMPT } from "./prompts/student-tutor";
import { STUDENT_ARTIFACTS_PROMPT } from "./prompts/student-artifacts";
import { LESSON_PLAN_PROMPT } from "./prompts/lesson-plan";
import { EXAM_GENERATION_PROMPT } from "./prompts/exam-generation";
import { ESSAY_CORRECTION_PROMPT } from "./prompts/essay-correction";
import type { Capability, CapabilityRoute, ModelId, ProviderId } from "./types";

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

export interface ResolvedRoute extends CapabilityRoute {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Resolve route por capability lendo DB primeiro, hardcoded como fallback.
 * Cacheado por request — várias chamadas no mesmo request batem o DB 1x.
 */
export const loadRoute = cache(
  async (capability: Capability): Promise<ResolvedRoute> => {
    const fallback = routeForHardcoded(capability);
    if (!dbAvailable()) return fallback;
    try {
      const rows = await db()
        .select()
        .from(llmRoutes)
        .where(and(eq(llmRoutes.capability, capability), eq(llmRoutes.active, true)))
        .limit(1);
      const row = rows[0];
      if (!row) return fallback;
      return {
        capability,
        provider: row.provider as ProviderId,
        model: row.model as ModelId,
        promptVersion: fallback.promptVersion,
        fallback:
          row.fallbackProvider && row.fallbackModel
            ? {
                provider: row.fallbackProvider as ProviderId,
                model: row.fallbackModel as ModelId,
              }
            : fallback.fallback,
        temperature: row.temperature ?? undefined,
        maxTokens: row.maxTokens ?? undefined,
      };
    } catch (err) {
      console.error("[llm/config] loadRoute fallback:", err);
      return fallback;
    }
  },
);

const HARDCODED_PROMPTS: Record<string, { version: string; content: string }> = {
  chat_student: STUDENT_TUTOR_PROMPT,
  student_artifact_generation: STUDENT_ARTIFACTS_PROMPT,
  plan_generation: LESSON_PLAN_PROMPT,
  exam_generation: EXAM_GENERATION_PROMPT,
  essay_correction: ESSAY_CORRECTION_PROMPT,
};

/**
 * Resolve prompt ativo por capability. Versão ativa do DB > hardcoded.
 */
export const loadActivePrompt = cache(
  async (
    capability: Capability,
  ): Promise<{ version: string; content: string } | null> => {
    const hardcoded = HARDCODED_PROMPTS[capability] ?? null;
    if (!dbAvailable()) return hardcoded;
    try {
      const rows = await db()
        .select({ version: systemPrompts.version, content: systemPrompts.content })
        .from(systemPrompts)
        .where(
          and(
            eq(systemPrompts.capability, capability),
            eq(systemPrompts.active, true),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (row) return row;
      return hardcoded;
    } catch (err) {
      console.error("[llm/config] loadActivePrompt fallback:", err);
      return hardcoded;
    }
  },
);
