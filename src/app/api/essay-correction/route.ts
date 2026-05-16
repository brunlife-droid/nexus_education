import { NextResponse, type NextRequest } from "next/server";
import { complete } from "@/lib/llm";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenants/server";
import { createBufferedSseResponse } from "@/lib/http/sse";
import { recordTeacherArtifact } from "@/lib/teacher/artifacts";

/**
 * POST /api/essay-correction
 *
 * Body: { studentName, topic, essay }
 *
 * Responde em linhas SSE com chunks { type: "text" | "done" | "error" }.
 * Capability `essay_correction` (GPT-4o-mini via OpenRouter, fallback
 * para claude-haiku-4-5 via routes.ts).
 *
 * Restrito a professor/coordenador/diretor/orientador.
 */

export const runtime = "nodejs";

interface EssayRequest {
  studentName?: string;
  topic?: string;
  essay?: string;
}

const TEACHER_ROLES = new Set([
  "professor",
  "coordenador",
  "diretor",
  "orientador",
]);

const MAX_ESSAY_LENGTH = 8000;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!TEACHER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tenant = await getCurrentTenant();
  const body = (await request.json()) as EssayRequest;

  const studentName = (body.studentName ?? "").trim() || "Aluno(a)";
  const topic = (body.topic ?? "").trim() || "(tema não informado)";
  const essay = (body.essay ?? "").trim();

  if (!essay) {
    return NextResponse.json(
      { error: "essay (texto da redação) é obrigatório" },
      { status: 400 },
    );
  }
  if (essay.length > MAX_ESSAY_LENGTH) {
    return NextResponse.json(
      {
        error: `texto da redação excede ${MAX_ESSAY_LENGTH} caracteres (recebido ${essay.length})`,
      },
      { status: 400 },
    );
  }

  const userMessage = [
    `Analise a redação abaixo nas 5 competências ENEM. Use exatamente o formato definido no prompt do sistema.`,
    ``,
    `Aluno: ${studentName}`,
    `Tema: ${topic}`,
    ``,
    `--- início da redação ---`,
    essay,
    `--- fim da redação ---`,
  ].join("\n");

  try {
    const result = await complete({
      capability: "essay_correction",
      messages: [{ role: "user", content: userMessage }],
      tenantId: tenant.id,
      maxTokens: 1600,
      systemContext: {
        prefeitura: tenant.short,
        tenant_uf: tenant.uf,
        student_name: studentName,
        essay_topic: topic,
      },
    });
    const artifactId = await recordTeacherArtifact({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      kind: "essay_correction",
      title: `${studentName} · ${topic}`,
      request: { studentName, topic, essayLength: essay.length },
      content: result.text,
      result,
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
          artifactId,
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
