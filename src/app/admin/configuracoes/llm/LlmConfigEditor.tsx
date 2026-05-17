"use client";

/**
 * Editor das rotas + prompts versionados.
 *
 * Lado esquerdo: lista de capabilities com modelo/temperature/maxTokens
 * editáveis inline. Salvar = upsert na tabela `llm_routes`.
 *
 * Lado direito: histórico de versões de prompt da capability selecionada.
 * Ações: criar nova versão (sempre cria, nunca sobrescreve), ativar uma
 * versão existente, apagar versão inativa. A versão `hardcoded` é a do
 * código — sempre disponível como fallback.
 *
 * Lista de modelos: tipos válidos de `ModelId` em `src/lib/llm/types.ts`.
 * Pra acrescentar, edite o tipo e a lista abaixo.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Badge, Button, Card, Chip } from "@/components/ui";
import {
  activatePromptVersion,
  createPromptVersion,
  deletePromptVersion,
  upsertRoute,
} from "@/lib/admin/llm-actions";

const PROVIDERS = ["openrouter", "openai", "mock"] as const;

const MODELS: Record<string, string[]> = {
  openrouter: [
    "anthropic/claude-haiku-4-5",
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-opus-4-7",
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "google/gemini-2.5-flash",
    "meta-llama/llama-3.3-70b-instruct",
  ],
  openai: ["text-embedding-3-small"],
  mock: ["mock"],
};

const CAPABILITY_LABEL: Record<string, string> = {
  chat_student: "Chat do aluno · tutora socrática",
  student_artifact_generation: "Artefatos de estudo do aluno",
  plan_generation: "Geração de plano de aula",
  exam_generation: "Geração de prova",
  essay_correction: "Correção de redação",
  bncc_classification: "Classificação BNCC",
  sre_classification: "Detecção SRE",
  embeddings_rag: "Embeddings (RAG)",
};

export interface RouteRow {
  capability: string;
  provider: string;
  model: string;
  temperature: number | null;
  maxTokens: number | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  source: "db" | "hardcoded";
  updatedAt: string | null;
}

export interface PromptRow {
  id: string;
  capability: string;
  version: string;
  content: string;
  active: boolean;
  source: "db" | "hardcoded";
  createdAt: string | null;
}

interface Props {
  routes: RouteRow[];
  promptsByCapability: Record<string, PromptRow[]>;
}

export function LlmConfigEditor({ routes, promptsByCapability }: Props) {
  const router = useRouter();
  const [selectedCap, setSelectedCap] = useState<string>(
    routes[0]?.capability ?? "chat_student",
  );
  const [pending, startTransition] = useTransition();

  const selectedPrompts = promptsByCapability[selectedCap] ?? [];

  function refresh() {
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ROTAS */}
      <Card className="p-0">
        <div className="border-border border-b px-6 py-4">
          <div className="text-sm font-semibold">
            Rotas por capability
          </div>
          <div className="text-text-muted mt-0.5 text-xs">
            Provider + modelo + parâmetros. Salvar aplica imediatamente.
          </div>
        </div>
        <div>
          {routes.map((r, i) => (
            <RouteCard
              key={r.capability}
              row={r}
              divider={i < routes.length - 1}
              onSelected={() => setSelectedCap(r.capability)}
              isSelected={selectedCap === r.capability}
              pending={pending}
              onSave={(input) =>
                startTransition(async () => {
                  try {
                    await upsertRoute(input);
                    refresh();
                  } catch (err) {
                    alert(err instanceof Error ? err.message : String(err));
                  }
                })
              }
            />
          ))}
        </div>
      </Card>

      {/* PROMPTS */}
      <Card className="p-0">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="text-sm font-semibold">
              Prompts ·{" "}
              {CAPABILITY_LABEL[selectedCap] ?? selectedCap}
            </div>
            <div className="text-text-muted mt-0.5 text-xs">
              Editar cria nova versão. Ativar é separado.
            </div>
          </div>
        </div>

        <PromptEditor
          capability={selectedCap}
          prompts={selectedPrompts}
          pending={pending}
          onCreate={(input) =>
            startTransition(async () => {
              try {
                await createPromptVersion(input);
                refresh();
              } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
              }
            })
          }
          onActivate={(promptId) =>
            startTransition(async () => {
              try {
                await activatePromptVersion({
                  capability: selectedCap,
                  promptId,
                });
                refresh();
              } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
              }
            })
          }
          onDelete={(promptId) =>
            startTransition(async () => {
              if (!confirm("Apagar essa versão?")) return;
              try {
                await deletePromptVersion({ promptId });
                refresh();
              } catch (err) {
                alert(err instanceof Error ? err.message : String(err));
              }
            })
          }
        />
      </Card>
    </div>
  );
}

function RouteCard({
  row,
  divider,
  onSelected,
  isSelected,
  onSave,
  pending,
}: {
  row: RouteRow;
  divider: boolean;
  onSelected: () => void;
  isSelected: boolean;
  onSave: (input: {
    capability: string;
    provider: string;
    model: string;
    temperature: number | null;
    maxTokens: number | null;
    fallbackProvider: string | null;
    fallbackModel: string | null;
  }) => void;
  pending: boolean;
}) {
  const [provider, setProvider] = useState(row.provider);
  const [model, setModel] = useState(row.model);
  const [temperature, setTemperature] = useState<string>(
    row.temperature?.toString() ?? "",
  );
  const [maxTokens, setMaxTokens] = useState<string>(
    row.maxTokens?.toString() ?? "",
  );
  const [fallbackProvider, setFallbackProvider] = useState<string>(
    row.fallbackProvider ?? "",
  );
  const [fallbackModel, setFallbackModel] = useState<string>(
    row.fallbackModel ?? "",
  );

  const dirty =
    provider !== row.provider ||
    model !== row.model ||
    (temperature || "") !== (row.temperature?.toString() ?? "") ||
    (maxTokens || "") !== (row.maxTokens?.toString() ?? "") ||
    (fallbackProvider || "") !== (row.fallbackProvider ?? "") ||
    (fallbackModel || "") !== (row.fallbackModel ?? "");

  function save() {
    onSave({
      capability: row.capability,
      provider,
      model,
      temperature: temperature ? parseFloat(temperature) : null,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : null,
      fallbackProvider: fallbackProvider || null,
      fallbackModel: fallbackModel || null,
    });
  }

  return (
    <div
      onClick={onSelected}
      className={`cursor-pointer px-6 py-4 transition-colors ${
        divider ? "border-border border-b" : ""
      } ${isSelected ? "bg-primary-soft" : "hover:bg-surface-2"}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[13px] font-semibold">
          {CAPABILITY_LABEL[row.capability] ?? row.capability}
        </span>
        <Chip style={{ fontFamily: "var(--font-mono)" }}>
          {row.capability}
        </Chip>
        {row.source === "db" ? (
          <Badge tone="success">DB</Badge>
        ) : (
          <Badge tone="warning">fallback</Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Provider">
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value;
              setProvider(p);
              const opts = MODELS[p] ?? [];
              if (!opts.includes(model)) setModel(opts[0] ?? "");
            }}
            className="bg-surface border-border-strong w-full rounded-md border px-2 py-1.5 text-xs"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Modelo">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-surface border-border-strong w-full rounded-md border px-2 py-1.5 text-xs"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {(MODELS[provider] ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Temperature (0–2)">
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="default"
            className="bg-surface border-border-strong w-full rounded-md border px-2 py-1.5 text-xs"
          />
        </Field>

        <Field label="Max tokens">
          <input
            type="number"
            min={1}
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="default"
            className="bg-surface border-border-strong w-full rounded-md border px-2 py-1.5 text-xs"
          />
        </Field>

        <Field label="Fallback provider">
          <select
            value={fallbackProvider}
            onChange={(e) => {
              const p = e.target.value;
              setFallbackProvider(p);
              if (!p) {
                setFallbackModel("");
              } else if (!(MODELS[p] ?? []).includes(fallbackModel)) {
                setFallbackModel(MODELS[p]?.[0] ?? "");
              }
            }}
            className="bg-surface border-border-strong w-full rounded-md border px-2 py-1.5 text-xs"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <option value="">(nenhum)</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fallback model">
          <select
            value={fallbackModel}
            onChange={(e) => setFallbackModel(e.target.value)}
            disabled={!fallbackProvider}
            className="bg-surface border-border-strong w-full rounded-md border px-2 py-1.5 text-xs disabled:opacity-50"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <option value="">(nenhum)</option>
            {(MODELS[fallbackProvider] ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {dirty && (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              save();
            }}
          >
            {pending ? "Salvando..." : "Salvar rota"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-text-faint mb-1 text-[10.5px] tracking-wider uppercase">
        {label}
      </div>
      {children}
    </label>
  );
}

function PromptEditor({
  capability,
  prompts,
  onCreate,
  onActivate,
  onDelete,
  pending,
}: {
  capability: string;
  prompts: PromptRow[];
  onCreate: (input: {
    capability: string;
    version: string;
    content: string;
    activate: boolean;
  }) => void;
  onActivate: (promptId: string) => void;
  onDelete: (promptId: string) => void;
  pending: boolean;
}) {
  const active = prompts.find((p) => p.active);
  const [draftVersion, setDraftVersion] = useState("");
  const [draftContent, setDraftContent] = useState(active?.content ?? "");
  const [editing, setEditing] = useState(false);
  const [activateOnSave, setActivateOnSave] = useState(true);

  // Reset draft when capability changes
  if (active && draftContent === "" && !editing) {
    setDraftContent(active.content);
  }

  function onPickToEdit() {
    setDraftContent(active?.content ?? "");
    setDraftVersion("");
    setEditing(true);
  }

  function submit() {
    if (!draftVersion.trim()) {
      alert("Informe um identificador de versão (ex: v4.4).");
      return;
    }
    onCreate({
      capability,
      version: draftVersion.trim(),
      content: draftContent,
      activate: activateOnSave,
    });
    setEditing(false);
    setDraftVersion("");
  }

  return (
    <div className="p-6">
      {active ? (
        <div className="mb-4">
          <div className="text-text-faint mb-1 text-[10.5px] tracking-wider uppercase">
            Versão ativa
          </div>
          <div className="flex items-center gap-2">
            <Chip style={{ fontFamily: "var(--font-mono)" }}>
              {active.version}
            </Chip>
            <Badge tone="success">
              <CheckCircle2 size={10} className="mr-0.5" />
              ativa
            </Badge>
            {active.source === "hardcoded" ? (
              <Badge tone="warning">fallback do código</Badge>
            ) : (
              <span className="text-text-faint text-[11px]">
                {active.createdAt
                  ? `criada ${new Date(active.createdAt).toLocaleDateString("pt-BR")}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-text-muted text-sm">Sem prompt ativo.</p>
      )}

      <div className="text-text-faint mb-1 text-[10.5px] tracking-wider uppercase">
        Conteúdo {editing ? "(editando — vai criar nova versão)" : ""}
      </div>
      <textarea
        value={editing ? draftContent : (active?.content ?? "")}
        onChange={(e) => setDraftContent(e.target.value)}
        readOnly={!editing}
        rows={14}
        className="bg-surface border-border-strong w-full rounded-md border p-3 text-xs leading-relaxed outline-none"
        style={{ fontFamily: "var(--font-mono)" }}
      />

      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={draftVersion}
            onChange={(e) => setDraftVersion(e.target.value)}
            placeholder="ID da versão (ex: v4.4)"
            className="bg-surface border-border-strong rounded-md border px-2 py-1.5 text-xs"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <label className="text-text-muted flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={activateOnSave}
              onChange={(e) => setActivateOnSave(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Ativar imediatamente
          </label>
          <div className="flex-1" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditing(false);
              setDraftContent(active?.content ?? "");
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            icon={<Send size={12} />}
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Salvando..." : "Criar versão"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            icon={<Edit3 size={12} />}
            onClick={onPickToEdit}
            disabled={pending}
          >
            Editar (cria nova versão)
          </Button>
        </div>
      )}

      {/* Histórico */}
      <div className="border-border mt-6 border-t pt-4">
        <div className="text-text-faint mb-2 text-[10.5px] tracking-wider uppercase">
          Histórico
        </div>
        <div className="flex flex-col gap-1.5">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="border-border flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <span
                className="font-semibold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {p.version}
              </span>
              {p.source === "hardcoded" ? (
                <Badge tone="warning">fallback</Badge>
              ) : (
                <span className="text-text-faint">
                  {p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString("pt-BR")
                    : ""}
                </span>
              )}
              {p.active && (
                <Badge tone="success">
                  <CheckCircle2 size={10} className="mr-0.5" />
                  ativa
                </Badge>
              )}
              <div className="flex-1" />
              {!p.active && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => onActivate(p.id)}
                >
                  {pending ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    "Ativar"
                  )}
                </Button>
              )}
              {p.source === "db" && !p.active && (
                <button
                  onClick={() => onDelete(p.id)}
                  disabled={pending}
                  className="text-text-faint hover:text-danger-fg p-1"
                  title="Apagar versão"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Atalho pra criar versão do zero */}
      {!editing && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={12} />}
            onClick={() => {
              setDraftContent("");
              setDraftVersion("");
              setEditing(true);
            }}
          >
            Criar versão em branco
          </Button>
        </div>
      )}
    </div>
  );
}
