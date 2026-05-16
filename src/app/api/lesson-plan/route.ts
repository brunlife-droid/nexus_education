import { NextResponse, type NextRequest } from "next/server";
import { complete } from "@/lib/llm";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenants/server";
import { createBufferedSseResponse } from "@/lib/http/sse";
import { recordTeacherArtifact } from "@/lib/teacher/artifacts";

/**
 * POST /api/lesson-plan
 *
 * Body: { subject, grade, topic, duration }
 *
 * Responde em linhas SSE com chunks { type: "text" | "done" | "error" }.
 * Gera plano de aula via capability `plan_generation` (Claude Haiku 4.5).
 * Restrito a professor/coordenador/diretor/orientador.
 */

export const runtime = "nodejs";

interface PlanRequest {
  subject?: string;
  grade?: string;
  topic?: string;
  duration?: string;
}

const TEACHER_ROLES = new Set(["professor", "coordenador", "diretor", "orientador"]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!TEACHER_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tenant = await getCurrentTenant();
  const body = (await request.json()) as PlanRequest;

  const subject = (body.subject ?? "").trim();
  const grade = (body.grade ?? "").trim();
  const topic = (body.topic ?? "").trim();
  const duration = (body.duration ?? "50 min").trim();

  if (!subject || !grade || !topic) {
    return NextResponse.json(
      { error: "subject, grade e topic são obrigatórios" },
      { status: 400 },
    );
  }

  const userMessage = [
    `Gere um plano de aula com os seguintes parâmetros:`,
    ``,
    `- Disciplina: ${subject}`,
    `- Série: ${grade}`,
    `- Tema: ${topic}`,
    `- Duração: ${duration}`,
    ``,
    `Identifique a habilidade BNCC mais provável e siga a estrutura definida.`,
  ].join("\n");
  try {
    const result = await complete({
      capability: "plan_generation",
      messages: [{ role: "user", content: userMessage }],
      tenantId: tenant.id,
      maxTokens: 1800,
      systemContext: {
        prefeitura: tenant.short,
        tenant_uf: tenant.uf,
      },
    });
    const artifactId = await recordTeacherArtifact({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      kind: "lesson_plan",
      title: `${subject} · ${topic}`,
      request: { subject, grade, topic, duration },
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
