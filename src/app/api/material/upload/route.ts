/**
 * Client uploads para Vercel Blob (signed URL).
 *
 * Por que assim e não via POST multipart:
 *   - Vercel Functions têm limite de 4.5MB no body. O usuário pede 50MB.
 *   - `handleUpload` gera um token assinado curto que o browser usa pra
 *     PUT direto na Blob — bypassa nossa função pro tráfego grande.
 *
 * Fluxo:
 *   1. Browser chama `upload()` do `@vercel/blob/client` → bate aqui.
 *   2. Aqui validamos sessão (papel = professor/coord/diretor/orientador),
 *      retornamos token assinado com clientPayload (classId, tenantId).
 *   3. Browser faz PUT direto na Blob com esse token.
 *   4. Quando termina, `onUploadCompleted` recebe webhook do Vercel Blob.
 *      Inserimos a row em `documents` (status=pending) e disparamos
 *      processamento fire-and-forget.
 *
 * IMPORTANTE: `onUploadCompleted` só roda em produção (Vercel não consegue
 * mandar webhook pra localhost). Pra dev, o cliente chama `/api/material/process`
 * direto após o upload.
 */

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { classes, documents } from "@/lib/db/schema";
import { getCurrentTenant } from "@/lib/tenants/server";

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();
        if (!session?.user) throw new Error("unauthorized");
        const role = session.user.role;
        if (
          role !== "professor" &&
          role !== "coordenador" &&
          role !== "diretor" &&
          role !== "orientador"
        ) {
          throw new Error("forbidden");
        }

        const parsed = clientPayload ? JSON.parse(clientPayload) : {};
        const classId = String(parsed.classId ?? "");
        const tenant = await getCurrentTenant();
        const tenantId = tenant.id;
        if (!classId) throw new Error("classId ausente");

        // Confirma que a turma pertence ao tenant antes de emitir token.
        if (process.env.DATABASE_URL) {
          const cls = await db()
            .select({ id: classes.id, tenantId: classes.tenantId })
            .from(classes)
            .where(eq(classes.id, classId))
            .limit(1);
          if (!cls[0] || cls[0].tenantId !== tenantId) {
            throw new Error("turma inválida para esse tenant");
          }
        }

        return {
          allowedContentTypes: ALLOWED_MIME,
          maximumSizeInBytes: MAX_BYTES,
          tokenPayload: JSON.stringify({
            classId,
            tenantId,
            uploadedBy: session.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Em prod, Vercel chama esse webhook quando o PUT termina. Em dev,
        // o navegador não consegue receber o webhook (URL local) — então
        // o cliente também dispara /api/material/process direto.
        if (!process.env.DATABASE_URL || !tokenPayload) return;
        try {
          const meta = JSON.parse(tokenPayload) as {
            classId: string;
            tenantId: string;
            uploadedBy: string;
          };
          const documentId = crypto.randomUUID();
          await db()
            .insert(documents)
            .values({
              id: documentId,
              tenantId: meta.tenantId,
              classId: meta.classId,
              uploadedBy: meta.uploadedBy,
              name: blob.pathname.split("/").pop() ?? "material",
              type: pickType(blob.contentType),
              kind: "class_material",
              status: "pending",
              sourceUrl: blob.url,
            });
          // Trigger fire-and-forget. Em dev (loopback inviável), o cliente
          // chama direto — aqui em prod tudo bem.
          fetch(`${baseUrl(request)}/api/material/process`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId }),
          }).catch(() => null);
        } catch (err) {
          console.error("[material/upload] onUploadCompleted failed:", err);
        }
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload failed" },
      { status: 400 },
    );
  }
}

function pickType(contentType: string | undefined): string {
  if (!contentType) return "bin";
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("word")) return "docx";
  if (contentType.includes("markdown")) return "md";
  return "txt";
}

function baseUrl(req: NextRequest): string {
  const env = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;
  if (env) return env.startsWith("http") ? env : `https://${env}`;
  return new URL(req.url).origin;
}
