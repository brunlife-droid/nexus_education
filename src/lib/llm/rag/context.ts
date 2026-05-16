/**
 * Monta os slots `{{foco_pedagogico}}` e `{{contexto_material}}` que o
 * prompt do tutor (v4.3) espera.
 *
 * Foco pedagógico: lê `class_focus_skills` da turma do aluno e formata as
 * habilidades BNCC priorizadas (código + descrição) — texto sucinto pra
 * caber no system prompt sem inchar.
 *
 * Contexto material: pega top-K chunks via RAG (`retrieveForClass`) e
 * formata como "Fonte: <nome do material>" + trecho.
 *
 * Quando nada bate → strings com placeholder neutro pra LLM não estranhar
 * slot vazio (não usar string vazia — Claude às vezes "comenta" o vazio).
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { classFocusSkills, habilities } from "@/lib/db/schema";
import { retrieveForClass, type RetrievedChunk } from "./retrieve";

const EMPTY_MATERIAL_BLOCK =
  "(Sem material relevante encontrado para essa pergunta. Responda com seu conhecimento amplo.)";

export interface RagSource {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  score: number;
}

export interface MaterialContext {
  block: string;
  sources: RagSource[];
}

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

function toRagSource(chunk: RetrievedChunk): RagSource {
  return {
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    chunkIndex: chunk.chunkIndex,
    score: Number(chunk.score),
  };
}

export async function buildFocusBlock(input: {
  tenantId: string;
  classId: string;
}): Promise<string> {
  if (!dbAvailable()) {
    return "(Nenhuma habilidade marcada como foco no momento.)";
  }
  try {
    const rows = await db()
      .select({
        code: habilities.code,
        area: habilities.area,
        description: habilities.description,
      })
      .from(classFocusSkills)
      .innerJoin(habilities, eq(habilities.code, classFocusSkills.habilityCode))
      .where(
        and(
          eq(classFocusSkills.classId, input.classId),
          eq(classFocusSkills.tenantId, input.tenantId),
        ),
      );

    if (rows.length === 0) {
      return "(Nenhuma habilidade marcada como foco no momento.)";
    }
    return rows
      .map((r) => `- ${r.code} (${r.area}) — ${r.description}`)
      .join("\n");
  } catch (err) {
    console.error("[rag/context] buildFocusBlock failed:", err);
    return "(Nenhuma habilidade marcada como foco no momento.)";
  }
}

export async function buildMaterialBlock(input: {
  tenantId: string;
  classId: string;
  query: string;
}): Promise<string> {
  const context = await buildMaterialContext(input);
  return context.block;
}

export async function buildMaterialContext(input: {
  tenantId: string;
  classId: string;
  query: string;
}): Promise<MaterialContext> {
  const chunks = await retrieveForClass({
    tenantId: input.tenantId,
    classId: input.classId,
    query: input.query,
    limit: 3,
    threshold: 0.35,
  });

  if (chunks.length === 0) {
    return { block: EMPTY_MATERIAL_BLOCK, sources: [] };
  }

  return {
    block: chunks.map(
      (c, i) =>
        `[Trecho ${i + 1} · Fonte: ${c.documentName}]\n${c.content.trim()}`,
    )
      .join("\n\n---\n\n"),
    sources: chunks.map(toRagSource),
  };
}
