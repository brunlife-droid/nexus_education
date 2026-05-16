"use client";

/**
 * Painel de "Foco pedagógico + Material da turma" no /professor/turma.
 *
 * Foco: multi-select de habilidades BNCC (toggles). Salva por Server Action.
 *
 * Material: upload direto pro Vercel Blob via @vercel/blob/client (bypassa
 * o limite de 4.5MB de body de função). Após upload, dispara processamento
 * (extração + embeddings) e refresca a página pra mostrar progresso.
 *
 * Restrição UX: arquivos até 50MB (PDF / DOCX / TXT / MD). O backend tem o
 * mesmo limite no token assinado.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Upload,
  FileText,
} from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import {
  setClassFocus,
  deleteClassMaterial,
  ensureMaterialProcessing,
} from "@/lib/teacher/actions";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export interface FocusOption {
  code: string;
  area: string;
  description: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  type: string;
  status: string;
  sizeBytes: number | null;
  error: string | null;
  indexedAt: string | null;
  createdAt: string;
}

interface Props {
  classId: string;
  available: FocusOption[];
  selected: string[];
  materials: MaterialItem[];
}

export function MaterialPanel({
  classId,
  available,
  selected,
  materials,
}: Props) {
  const router = useRouter();
  const [selectedCodes, setSelectedCodes] = useState<string[]>(selected);
  const [saving, startSaving] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const dirty =
    selectedCodes.slice().sort().join(",") !== selected.slice().sort().join(",");

  function toggle(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function save() {
    startSaving(async () => {
      await setClassFocus({ classId, habilityCodes: selectedCodes });
      router.refresh();
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-upload do mesmo nome
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_BYTES) {
      setUploadError(`Arquivo passa de ${MAX_BYTES / 1024 / 1024}MB.`);
      return;
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      setUploadError(
        `Tipo não suportado: ${file.type}. Use PDF, DOCX, TXT ou Markdown.`,
      );
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`materials/${classId}/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/material/upload",
        clientPayload: JSON.stringify({
          classId,
        }),
      });

      // Garante a row e dispara processamento (cobre dev sem webhook).
      const result = await ensureMaterialProcessing({
        classId,
        blobUrl: blob.url,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      if ("documentId" in result && result.documentId) {
        fetch("/api/material/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: result.documentId }),
        }).catch(() => null);
      }

      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(documentId: string) {
    if (!confirm("Remover este material? A tutora deixa de usá-lo.")) return;
    startSaving(async () => {
      await deleteClassMaterial({ documentId });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      {/* FOCO PEDAGÓGICO */}
      <Card className="p-0">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="text-sm font-semibold">Foco pedagógico da turma</div>
            <div className="text-text-muted mt-0.5 text-xs">
              A tutora prioriza essas habilidades nas conversas com os alunos
            </div>
          </div>
          {dirty && (
            <Button size="sm" disabled={saving} onClick={save}>
              {saving ? "Salvando..." : "Salvar foco"}
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto p-4">
          {available.length === 0 ? (
            <p className="text-text-muted text-sm">
              Sem habilidades BNCC cadastradas ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {available.map((h) => {
                const active = selectedCodes.includes(h.code);
                return (
                  <label
                    key={h.code}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-xs transition-colors ${
                      active
                        ? "border-primary-border bg-primary-soft"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggle(h.code)}
                      className="mt-0.5 accent-[var(--primary)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {h.code}
                        </span>
                        <Badge tone="primary">{h.area}</Badge>
                      </div>
                      <div className="text-text-muted mt-0.5 leading-relaxed">
                        {h.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* MATERIAL DA TURMA */}
      <Card className="p-0">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="text-sm font-semibold">Material da turma</div>
            <div className="text-text-muted mt-0.5 text-xs">
              PDF, DOCX, TXT até 50MB. A tutora usa como fonte primária.
            </div>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <span
              className={`bg-primary text-primary-fg inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                uploading ? "opacity-60" : "hover:bg-primary-hover"
              }`}
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              {uploading ? "Enviando..." : "Subir material"}
            </span>
          </label>
        </div>

        {uploadError && (
          <div className="border-border bg-danger-soft text-danger-fg border-b px-6 py-2.5 text-xs">
            {uploadError}
          </div>
        )}

        {materials.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-muted text-sm">
              Nenhum material subido ainda.
            </p>
            <p className="text-text-faint mt-1 text-xs">
              A tutora segue funcionando com base ampla — material é bônus
              de contexto.
            </p>
          </div>
        ) : (
          <div>
            {materials.map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-6 py-3 ${
                  i < materials.length - 1 ? "border-border border-b" : ""
                }`}
              >
                <FileText size={16} className="text-text-faint shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {m.name}
                  </div>
                  <div className="text-text-faint mt-0.5 flex items-center gap-2 text-[11px]">
                    <span className="uppercase">{m.type}</span>
                    {m.sizeBytes && (
                      <span>· {(m.sizeBytes / 1024 / 1024).toFixed(1)}MB</span>
                    )}
                    {m.indexedAt && (
                      <span>
                        · indexado{" "}
                        {new Date(m.indexedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                  {m.error && (
                    <div className="text-danger-fg mt-0.5 text-[11px]">
                      {m.error}
                    </div>
                  )}
                </div>
                <StatusBadge status={m.status} />
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-text-faint hover:text-danger-fg p-1"
                  title="Remover material"
                  disabled={saving}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="text-success-fg flex items-center gap-1 text-[11px]">
        <CheckCircle2 size={12} />
        pronto
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-danger-fg flex items-center gap-1 text-[11px]">
        <AlertCircle size={12} />
        falhou
      </span>
    );
  }
  return (
    <span className="text-text-faint flex items-center gap-1 text-[11px]">
      <Loader2 size={12} className="animate-spin" />
      {status === "processing" ? "processando" : "aguardando"}
    </span>
  );
}
