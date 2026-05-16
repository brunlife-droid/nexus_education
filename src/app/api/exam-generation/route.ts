import { NextResponse, type NextRequest } from "next/server";
import { complete } from "@/lib/llm";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenants/server";
import { createBufferedSseResponse } from "@/lib/http/sse";

/**
 * POST /api/exam-generation
 *
 * Body: { subject, grade, topics, questionCount, versions, duration, difficulty }
 *
 * Responde em linhas SSE com chunks { type: "text" | "done" | "error" }.
 * Capability `exam_generation` (Claude Haiku 4.5 via OpenRouter).
 * Restrito a professor/coordenador/diretor/orientador.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

interface ExamRequest {
  subject?: string;
  grade?: string;
  topics?: string;
  questionCount?: number;
  versions?: string;
  duration?: string;
  difficulty?: string;
}

const TEACHER_ROLES = new Set([
  "professor",
  "coordenador",
  "diretor",
  "orientador",
]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!TEACHER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tenant = await getCurrentTenant();
  const body = (await request.json()) as ExamRequest;

  const subject = (body.subject ?? "").trim();
  const grade = (body.grade ?? "").trim();
  const topics = (body.topics ?? "").trim();
  const questionCount = normalizeQuestionCount(body.questionCount);
  const versions = (body.versions ?? "A").trim() || "A";
  const duration = (body.duration ?? "50 min").trim() || "50 min";
  const difficulty = (body.difficulty ?? "3 fáceis, 5 médias, 2 difíceis").trim();

  if (!subject || !grade || !topics) {
    return NextResponse.json(
      { error: "subject, grade e topics são obrigatórios" },
      { status: 400 },
    );
  }

  const userMessage = [
    `Gere uma prova com os seguintes parâmetros:`,
    ``,
    `- Disciplina: ${subject}`,
    `- Série: ${grade}`,
    `- Tema(s): ${topics}`,
    `- Total de questões: ${questionCount}`,
    `- Versões: ${versions}`,
    `- Duração: ${duration}`,
    `- Distribuição de dificuldade: ${difficulty}`,
    ``,
    `Inclua matriz BNCC, prova(s), gabarito comentado e critérios para questões discursivas.`,
  ].join("\n");

  try {
    const result = await complete({
      capability: "exam_generation",
      messages: [{ role: "user", content: userMessage }],
      tenantId: tenant.id,
      temperature: 0.4,
      maxTokens: 2200,
      systemContext: {
        prefeitura: tenant.short,
        tenant_uf: tenant.uf,
      },
    });

    return createBufferedSseResponse([
      { type: "text", text: result.text },
      {
        type: "done",
        meta: {
          model: result.model,
          provider: result.provider,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
        },
      },
    ]);
  } catch (err) {
    return createBufferedSseResponse([
      {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      },
    ]);
  }
}

function normalizeQuestionCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.max(3, Math.min(30, Math.round(n)));
}
