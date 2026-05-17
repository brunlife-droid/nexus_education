/**
 * Queries do admin pra montar a tela `/admin/configuracoes/llm`.
 *
 * Combina o estado do DB com o fallback hardcoded (`routes.ts` /
 * `prompts/*`) — assim a UI sempre mostra a config "que vai rodar"
 * mesmo antes de o admin ter criado registro no DB.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { llmRoutes, systemPrompts } from "@/lib/db/schema";
import { ROUTES } from "@/lib/llm/routes";
import { STUDENT_TUTOR_PROMPT } from "@/lib/llm/prompts/student-tutor";
import { STUDENT_ARTIFACTS_PROMPT } from "@/lib/llm/prompts/student-artifacts";
import { LESSON_PLAN_PROMPT } from "@/lib/llm/prompts/lesson-plan";
import { EXAM_GENERATION_PROMPT } from "@/lib/llm/prompts/exam-generation";
import { ESSAY_CORRECTION_PROMPT } from "@/lib/llm/prompts/essay-correction";
import type { Capability } from "@/lib/llm/types";

function dbAvailable() {
  return !!process.env.DATABASE_URL;
}

export interface LlmRouteRow {
  capability: Capability;
  provider: string;
  model: string;
  temperature: number | null;
  maxTokens: number | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  source: "db" | "hardcoded";
  updatedAt: Date | null;
}

const HARDCODED_PROMPTS: Record<string, { version: string; content: string }> =
  {
    chat_student: STUDENT_TUTOR_PROMPT,
    student_artifact_generation: STUDENT_ARTIFACTS_PROMPT,
    plan_generation: LESSON_PLAN_PROMPT,
    exam_generation: EXAM_GENERATION_PROMPT,
    essay_correction: ESSAY_CORRECTION_PROMPT,
  };

export async function loadAllRoutes(): Promise<LlmRouteRow[]> {
  if (!dbAvailable()) {
    return ROUTES.map((r) => ({
      capability: r.capability,
      provider: r.provider,
      model: r.model,
      temperature: null,
      maxTokens: null,
      fallbackProvider: r.fallback?.provider ?? null,
      fallbackModel: r.fallback?.model ?? null,
      source: "hardcoded" as const,
      updatedAt: null,
    }));
  }
  try {
    const dbRows = await db().select().from(llmRoutes);
    return ROUTES.map((r) => {
      const dbRow = dbRows.find((d) => d.capability === r.capability);
      if (dbRow) {
        return {
          capability: r.capability,
          provider: dbRow.provider,
          model: dbRow.model,
          temperature: dbRow.temperature,
          maxTokens: dbRow.maxTokens,
          fallbackProvider: dbRow.fallbackProvider,
          fallbackModel: dbRow.fallbackModel,
          source: "db" as const,
          updatedAt: dbRow.updatedAt,
        };
      }
      return {
        capability: r.capability,
        provider: r.provider,
        model: r.model,
        temperature: null,
        maxTokens: null,
        fallbackProvider: r.fallback?.provider ?? null,
        fallbackModel: r.fallback?.model ?? null,
        source: "hardcoded" as const,
        updatedAt: null,
      };
    });
  } catch (err) {
    console.error("[admin/llm-queries] loadAllRoutes failed:", err);
    return [];
  }
}

export interface PromptRow {
  id: string;
  capability: string;
  version: string;
  content: string;
  active: boolean;
  createdAt: Date;
  source: "db" | "hardcoded";
}

export async function loadPromptsForCapability(
  capability: Capability,
): Promise<PromptRow[]> {
  const hardcoded = HARDCODED_PROMPTS[capability];
  const list: PromptRow[] = [];
  if (dbAvailable()) {
    try {
      const rows = await db()
        .select()
        .from(systemPrompts)
        .where(eq(systemPrompts.capability, capability))
        .orderBy(desc(systemPrompts.createdAt));
      for (const r of rows) {
        list.push({
          id: r.id,
          capability: r.capability,
          version: r.version,
          content: r.content,
          active: r.active,
          createdAt: r.createdAt,
          source: "db" as const,
        });
      }
    } catch (err) {
      console.error("[admin/llm-queries] loadPromptsForCapability failed:", err);
    }
  }
  if (hardcoded) {
    const hasActiveInDb = list.some((p) => p.active);
    list.push({
      id: `hardcoded:${capability}`,
      capability,
      version: hardcoded.version,
      content: hardcoded.content,
      active: !hasActiveInDb,
      createdAt: new Date(0),
      source: "hardcoded" as const,
    });
  }
  return list;
}
