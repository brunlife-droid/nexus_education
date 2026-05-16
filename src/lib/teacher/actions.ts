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

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  chunks,
  classes,
  classFocusSkills,
  documents,
  habilities,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenants/server";
import { HABILIDADES_BNCC } from "@/lib/mocks";

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
  await assertClassInTenant(input.classId, tenant.id);

  if (!process.env.DATABASE_URL) return { ok: true, applied: 0 };

  // Substitui o conjunto inteiro de habilidades em foco (mais simples
  // que diff e suficiente — a lista é curta).
  await db()
    .delete(classFocusSkills)
    .where(
      and(
        eq(classFocusSkills.classId, input.classId),
        eq(classFocusSkills.tenantId, tenant.id),
      ),
  );

  if (input.habilityCodes.length > 0) {
    await ensureHabilities(input.habilityCodes);
    await db()
      .insert(classFocusSkills)
      .values(
        input.habilityCodes.map((code) => ({
          tenantId: tenant.id,
          classId: input.classId,
          habilityCode: code,
          setBy: user.id,
        })),
      );
  }

  revalidatePath("/professor/turma");
  return { ok: true, applied: input.habilityCodes.length };
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
      const { del } = await import("@vercel/blob");
      await del(doc.sourceUrl);
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
  await assertClassInTenant(input.classId, tenant.id);

  if (!process.env.DATABASE_URL) return { ok: true };

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
        uploadedBy: user.id,
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

async function ensureHabilities(codes: string[]) {
  const known = HABILIDADES_BNCC.filter((h) => codes.includes(h.codigo));
  if (known.length === 0) return;

  await db()
    .insert(habilities)
    .values(
      known.map((h) => ({
        code: h.codigo,
        area: h.area,
        description: h.desc,
        grade: "7",
      })),
    )
    .onConflictDoNothing();
}

function pickType(contentType: string): string {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("word")) return "docx";
  if (contentType.includes("markdown")) return "md";
  return "txt";
}
