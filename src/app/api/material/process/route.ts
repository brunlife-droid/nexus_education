/**
 * Processa um material da turma: baixa do storage privado, extrai texto, chunka,
 * gera embeddings e salva em `chunks`.
 *
 * Pode ser disparado:
 *   - Pelo webhook `onUploadCompleted` em prod (fire-and-forget).
 *   - Pelo browser logo após upload em dev (já que webhook localhost
 *     não funciona).
 *
 * É idempotente por documentId: se o doc já está `ready`, não reprocessa.
 *
 * Atenção: roda em runtime `nodejs` porque pdf-parse e mammoth não
 * funcionam em edge. Em arquivos grandes pode estourar o timeout default
 * de 60s do Vercel Hobby — o `maxDuration` empurra pro limite do plano.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chunks, documents } from "@/lib/db/schema";
import { downloadFileByUrl } from "@/lib/storage";
import { extractText } from "@/lib/llm/rag/extract";
import { chunkText } from "@/lib/llm/rag/chunk";
import { embedBatch } from "@/lib/llm/providers/openai-embeddings";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenants/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const EMBED_BATCH = 32;

export async function POST(request: NextRequest) {
  // Caller pode ser o webhook do Blob (sem sessão) ou o browser do prof.
  // Como o documento já está vinculado a uma classId/tenant, e a entrada
  // não recebe conteúdo do usuário além do documentId, o risco é baixo.
  // Mesmo assim, exigimos sessão de papel pedagógico quando vem do browser
  // (header User-Agent indica navegador). Webhook pula auth.
  const isBrowser = !!request.headers.get("cookie");
  let browserTenantId: string | null = null;
  if (isBrowser) {
    const session = await auth();
    const role = session?.user?.role;
    if (
      !session?.user ||
      (role !== "professor" &&
        role !== "coordenador" &&
        role !== "diretor" &&
        role !== "orientador" &&
        role !== "admin_nexus")
    ) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    browserTenantId = (await getCurrentTenant()).id;
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "db unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    documentId?: string;
  };
  const documentId = body.documentId;
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  const doc = (
    await db()
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1)
  )[0];
  if (!doc) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }
  if (browserTenantId && doc.tenantId !== browserTenantId) {
    return NextResponse.json({ error: "document not found" }, { status: 404 });
  }
  if (doc.status === "ready") {
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }
  if (!doc.sourceUrl) {
    return NextResponse.json({ error: "sourceUrl missing" }, { status: 400 });
  }
  const sourceUrl = doc.sourceUrl;
  if (!doc.tenantId) {
    return NextResponse.json({ error: "tenantId missing" }, { status: 400 });
  }
  const docTenantId = doc.tenantId;

  await db()
    .update(documents)
    .set({ status: "processing", error: null })
    .where(eq(documents.id, documentId));

  try {
    const stored = await downloadFileByUrl(sourceUrl, {
      tenantId: docTenantId,
    });
    const buffer = stored.buffer;
    const mime = stored.contentType;

    const text = await extractText(buffer, mime, doc.name);
    const parts = chunkText(text);
    if (parts.length === 0) {
      throw new Error("nenhum texto extraído do arquivo");
    }

    // Limpa chunks antigos do mesmo documento (reprocessamento idempotente).
    await db().delete(chunks).where(eq(chunks.documentId, documentId));

    // Embeddings em lote.
    for (let i = 0; i < parts.length; i += EMBED_BATCH) {
      const slice = parts.slice(i, i + EMBED_BATCH);
      const vectors = await embedBatch(slice.map((p) => p.content));
      await db()
        .insert(chunks)
        .values(
          slice.map((p, idx) => ({
            id: crypto.randomUUID(),
            documentId,
            tenantId: doc.tenantId,
            chunkIndex: p.index,
            content: p.content,
            embedding: vectors[idx],
            metadata: { sourceName: doc.name },
          })),
        );
    }

    await db()
      .update(documents)
      .set({
        status: "ready",
        indexedAt: new Date(),
        sizeBytes: buffer.length,
        error: null,
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json({
      ok: true,
      documentId,
      chunks: parts.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[material/process] failed:", err);
    await db()
      .update(documents)
      .set({ status: "failed", error: message })
      .where(eq(documents.id, documentId));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Em dev (e como fallback de prod), o cliente chama POST direto.
 * GET é só pra debug (verifica status).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");
  if (!documentId || !process.env.DATABASE_URL) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }
  const rows = await db()
    .select({
      id: documents.id,
      name: documents.name,
      status: documents.status,
      error: documents.error,
      indexedAt: documents.indexedAt,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId)))
    .limit(1);
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
