"use server";

/**
 * Server Actions do contexto Professor: foco pedagógico + materiais.
 *
 * Todas validam:
 *   1. Sessão com papel pedagógico (professor/coord/diretor/orientador).
 *   2. Membership no tenant.
 *   3. Que a turma pertence ao tenant atual (segunda barreira).
 *
 * Use direto em forms via `<form action={...}>` ou via `useTransition`
 * de Client Components.
 */

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { chunks, classes, documents } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { deleteFile, pathnameFromStorageUrl } from "@/lib/storage";
import { getCurrentTenant } from "@/lib/tenants/server";
import { ensureDemoClassScope, ensureSessionUserId } from "./demo-db";
import { saveClassFocus } from "./focus-service";

async function requirePedagogicalSession() {
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
  return session.user;
}

async function assertClassInTenant(classId: string, tenantId: string) {
  if (!process.env.DATABASE_URL) return;
  const rows = await db()
    .select({ tenantId: classes.tenantId })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  if (!rows[0] || rows[0].tenantId !== tenantId) {
    throw new Error("turma inválida para esse tenant");
  }
}

export async function setClassFocus(input: {
  classId: string;
  habilityCodes: string[];
}) {
  const user = await requirePedagogicalSession();
  const tenant = await getCurrentTenant();
  const result = await saveClassFocus({
    actor: user,
    classId: input.classId,
    habilityCodes: input.habilityCodes,
    tenantId: tenant.id,
  });
  if (result.ok) {
    revalidatePath("/professor/turma");
  }
  return result;
}

export async function deleteClassMaterial(input: { documentId: string }) {
  await requirePedagogicalSession();
  const tenant = await getCurrentTenant();

  if (!process.env.DATABASE_URL) return { ok: true };

  // Verifica que o material é desse tenant antes de deletar.
  const doc = (
    await db()
      .select({
        id: documents.id,
        tenantId: documents.tenantId,
        sourceUrl: documents.sourceUrl,
      })
      .from(documents)
      .where(eq(documents.id, input.documentId))
      .limit(1)
  )[0];
  if (!doc || doc.tenantId !== tenant.id) {
    throw new Error("material não encontrado");
  }

  // Apaga chunks (FK cascade) e o documento.
  await db().delete(chunks).where(eq(chunks.documentId, input.documentId));
  await db().delete(documents).where(eq(documents.id, input.documentId));

  // Best-effort: apaga blob físico (não bloqueia se falhar).
  if (doc.sourceUrl) {
    try {
      const pathname = pathnameFromStorageUrl(doc.sourceUrl);
      if (pathname) await deleteFile(pathname);
    } catch (err) {
      console.warn("[actions] blob delete failed:", err);
    }
  }

  revalidatePath("/professor/turma");
  return { ok: true };
}

/**
 * Disparado pelo cliente após upload concluído pra garantir que o doc
 * existe e o processamento foi iniciado (cobre dev sem webhook).
 */
export async function ensureMaterialProcessing(input: {
  classId: string;
  blobUrl: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  const user = await requirePedagogicalSession();
  const tenant = await getCurrentTenant();
  await ensureDemoClassScope(input.classId, tenant.id);
  await assertClassInTenant(input.classId, tenant.id);

  if (!process.env.DATABASE_URL) return { ok: true };
  const actorUserId = await ensureSessionUserId(user);

  // Verifica se já existe row pra essa URL (webhook pode ter criado).
  const existing = (
    await db()
      .select({ id: documents.id, status: documents.status })
      .from(documents)
      .where(eq(documents.sourceUrl, input.blobUrl))
      .limit(1)
  )[0];

  let documentId = existing?.id;
  if (!existing) {
    documentId = crypto.randomUUID();
    await db()
      .insert(documents)
      .values({
        id: documentId,
        tenantId: tenant.id,
        classId: input.classId,
        uploadedBy: actorUserId,
        name: input.filename,
        type: pickType(input.contentType),
        kind: "class_material",
        status: "pending",
        sourceUrl: input.blobUrl,
        sizeBytes: input.sizeBytes,
      });
  }

  revalidatePath("/professor/turma");
  return { ok: true, documentId };
}

function pickType(contentType: string): string {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("word")) return "docx";
  if (contentType.includes("markdown")) return "md";
  return "txt";
}
