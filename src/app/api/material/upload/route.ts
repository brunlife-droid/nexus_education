import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { classes, documents } from "@/lib/db/schema";
import { uploadFile } from "@/lib/storage";
import { getCurrentTenant } from "@/lib/tenants/server";
import {
  ensureDemoClassScope,
  ensureSessionUserId,
} from "@/lib/teacher/demo-db";

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const MAX_BYTES = 50 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (
    role !== "professor" &&
    role !== "coordenador" &&
    role !== "diretor" &&
    role !== "orientador"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const classId = form.get("classId");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file ausente" }, { status: 400 });
  }
  if (typeof classId !== "string" || !classId) {
    return NextResponse.json({ error: "classId ausente" }, { status: 400 });
  }

  const mime = file.type || inferMime(file.name);
  if (!ALLOWED_MIME.includes(mime)) {
    return NextResponse.json(
      { error: `Tipo nao suportado: ${mime}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo passa de ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }

  const tenant = await getCurrentTenant();
  let uploadedBy: string | null = null;

  if (process.env.DATABASE_URL) {
    await ensureDemoClassScope(classId, tenant.id);
    const cls = await db()
      .select({ tenantId: classes.tenantId })
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);
    if (!cls[0] || cls[0].tenantId !== tenant.id) {
      return NextResponse.json({ error: "turma invalida" }, { status: 404 });
    }
    uploadedBy = await ensureSessionUserId(session.user);
  }

  try {
    const stored = await uploadFile(file, {
      tenantId: tenant.id,
      kind: "document",
      ownerId: classId,
    });

    let documentId: string | null = null;
    if (process.env.DATABASE_URL) {
      documentId = crypto.randomUUID();
      await db()
        .insert(documents)
        .values({
          id: documentId,
          tenantId: tenant.id,
          classId,
          uploadedBy,
          name: file.name,
          type: pickType(mime),
          kind: "class_material",
          status: "pending",
          sourceUrl: stored.url,
          sizeBytes: stored.size,
        });
    }

    return NextResponse.json({
      ok: true,
      documentId,
      file: { ...stored, contentType: mime, name: file.name },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload failed" },
      { status: 500 },
    );
  }
}

function pickType(contentType: string): string {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("word")) return "docx";
  if (contentType.includes("markdown")) return "md";
  return "txt";
}

function inferMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}
