import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { uploadFile } from "@/lib/storage";
import { getCurrentTenant } from "@/lib/tenants/server";
import type { StorageKind } from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Body: multipart/form-data com:
 *   - file: arquivo (foto, áudio, PDF/DOCX/TXT, logo)
 *   - kind: "image" | "audio" | "document" | "logo"
 *   - ownerId: (opcional) id lógico do dono (conversation_id, student_id...)
 *
 * Validações:
 *   - Usuário autenticado (NextAuth session)
 *   - Tipo MIME na whitelist por kind
 *   - Tamanho máximo: image 10MB, audio 25MB, document 50MB, logo 2MB
 */

const ALLOWED_TYPES: Record<StorageKind, RegExp> = {
  image: /^image\/(jpeg|png|webp|heic|heif)$/,
  audio: /^audio\/(mpeg|mp4|mpga|m4a|webm|ogg|wav|x-m4a|flac)$/,
  document:
    /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|text\/markdown)$/,
  logo: /^image\/(png|svg\+xml|webp)$/,
};

const MAX_SIZE: Record<StorageKind, number> = {
  image: 10 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  document: 50 * 1024 * 1024,
  logo: 2 * 1024 * 1024,
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const tenant = await getCurrentTenant();
  const form = await request.formData();
  const file = form.get("file");
  const kindRaw = form.get("kind");
  const ownerId = form.get("ownerId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file ausente" }, { status: 400 });
  }
  if (typeof kindRaw !== "string" || !(kindRaw in ALLOWED_TYPES)) {
    return NextResponse.json({ error: "kind inválido" }, { status: 400 });
  }
  const kind = kindRaw as StorageKind;

  const mime = file.type || inferMime(file.name);

  if (!ALLOWED_TYPES[kind].test(mime)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não permitido para ${kind}: ${mime}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_SIZE[kind]) {
    return NextResponse.json(
      {
        error: `Arquivo excede ${MAX_SIZE[kind] / 1024 / 1024}MB para ${kind}`,
      },
      { status: 413 },
    );
  }

  try {
    const stored = await uploadFile(file, {
      tenantId: tenant.id,
      kind,
      ownerId: typeof ownerId === "string" ? ownerId : undefined,
    });
    return NextResponse.json({
      ok: true,
      file: { ...stored, contentType: mime },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha no upload" },
      { status: 500 },
    );
  }
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
