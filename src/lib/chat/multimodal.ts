import { get } from "@vercel/blob";
import { extractText } from "@/lib/llm/rag/extract";
import type { ChatContentPart, ChatMessage } from "@/lib/llm/types";
import type { MediaMessageAttachment } from "./persistence";

export type IncomingChatAttachment = {
  kind: "image" | "audio" | "document";
  url: string;
  mime?: string;
  name?: string;
  size?: number;
};

export type IncomingChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: IncomingChatAttachment[];
};

export interface PreparedChatPayload {
  messages: ChatMessage[];
  lastUserAttachments: MediaMessageAttachment[];
  ragQuery: string;
}

const MAX_IMAGE_INLINE_BYTES = 7 * 1024 * 1024;
const MAX_EXTRACTED_TEXT = 12000;
const MAX_RAG_TEXT = 4000;

export function normalizeIncomingMessages(value: unknown): IncomingChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      if (
        raw.role !== "user" &&
        raw.role !== "assistant" &&
        raw.role !== "system"
      ) {
        return null;
      }
      const content = typeof raw.content === "string" ? raw.content : "";
      const attachments = normalizeAttachments(raw.attachments);
      return { role: raw.role, content, attachments } satisfies IncomingChatMessage;
    })
    .filter((item): item is IncomingChatMessage => !!item);
}

export async function prepareChatPayload(
  messages: IncomingChatMessage[],
): Promise<PreparedChatPayload> {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
  const lastUser = lastUserIndex >= 0 ? messages[lastUserIndex] : null;
  const lastUserAttachments: MediaMessageAttachment[] = [];
  const llmMessages: ChatMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    if (i !== lastUserIndex) {
      llmMessages.push({
        role: message.role,
        content: textWithAttachmentSummaries(message.content, message.attachments),
      });
      continue;
    }

    const prepared = await prepareUserAttachmentContent(message);
    lastUserAttachments.push(...prepared.attachments);
    llmMessages.push({ role: message.role, content: prepared.content });
  }

  const ragQuery = clamp(
    [
      lastUser?.content ?? "",
      ...lastUserAttachments.map((attachment) => {
        if (attachment.transcript) return attachment.transcript;
        if (attachment.extractedText) return attachment.extractedText;
        return attachment.name ?? "";
      }),
    ]
      .join("\n")
      .trim(),
    MAX_RAG_TEXT,
  );

  return {
    messages: llmMessages,
    lastUserAttachments,
    ragQuery,
  };
}

async function prepareUserAttachmentContent(message: IncomingChatMessage): Promise<{
  content: string | ChatContentPart[];
  attachments: MediaMessageAttachment[];
}> {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) {
    return { content: message.content, attachments: [] };
  }

  const processed: MediaMessageAttachment[] = [];
  const contextLines: string[] = [];
  const imageParts: ChatContentPart[] = [];

  for (const attachment of attachments.slice(0, 4)) {
    const result = await processAttachment(attachment);
    processed.push(result.attachment);
    contextLines.push(result.promptLine);
    if (result.imagePart) imageParts.push(result.imagePart);
  }

  const text = [
    message.content.trim() || "Analise o anexo enviado e me ajude a estudar.",
    "",
    "Anexos processados pelo Nexus:",
    ...contextLines,
  ].join("\n");

  if (imageParts.length === 0) {
    return { content: text, attachments: processed };
  }

  return {
    content: [{ type: "text", text }, ...imageParts],
    attachments: processed,
  };
}

async function processAttachment(input: IncomingChatAttachment): Promise<{
  attachment: MediaMessageAttachment;
  promptLine: string;
  imagePart?: ChatContentPart;
}> {
  const attachment: MediaMessageAttachment = {
    kind: input.kind,
    url: input.url,
    mime: input.mime || "application/octet-stream",
    name: input.name,
    size: input.size,
  };

  if (input.kind === "image") {
    const loaded = await loadAttachmentBuffer(input);
    if (!loaded.ok) {
      return {
        attachment: { ...attachment, analysisError: loaded.error },
        promptLine: `- Imagem "${safeName(input)}": nao foi possivel carregar (${loaded.error}).`,
      };
    }
    const mime = input.mime || loaded.mime || "image/png";
    const imagePart =
      loaded.buffer.byteLength <= MAX_IMAGE_INLINE_BYTES
        ? {
            type: "image" as const,
            image: `data:${mime};base64,${loaded.buffer.toString("base64")}`,
            mimeType: mime,
          }
        : undefined;
    return {
      attachment: { ...attachment, mime },
      promptLine: imagePart
        ? `- Imagem "${safeName(input)}" anexada para analise visual.`
        : `- Imagem "${safeName(input)}" e grande demais para inline; use a descricao do aluno e peça uma imagem menor se necessario.`,
      imagePart,
    };
  }

  if (input.kind === "audio") {
    const loaded = await loadAttachmentBuffer(input);
    if (!loaded.ok) {
      return {
        attachment: { ...attachment, analysisError: loaded.error },
        promptLine: `- Audio "${safeName(input)}": nao foi possivel carregar (${loaded.error}).`,
      };
    }
    const transcription = await transcribeAudio({
      buffer: loaded.buffer,
      mime: input.mime || loaded.mime || "audio/webm",
      filename: safeName(input),
    });
    if (!transcription.ok) {
      return {
        attachment: { ...attachment, analysisError: transcription.error },
        promptLine: `- Audio "${safeName(input)}": transcricao indisponivel (${transcription.error}). Peça para o aluno reenviar ou resumir em texto.`,
      };
    }
    return {
      attachment: {
        ...attachment,
        transcript: clamp(transcription.text, MAX_EXTRACTED_TEXT),
      },
      promptLine: `- Audio "${safeName(input)}" transcrito: ${clamp(transcription.text, 1800)}`,
    };
  }

  const loaded = await loadAttachmentBuffer(input);
  if (!loaded.ok) {
    return {
      attachment: { ...attachment, analysisError: loaded.error },
      promptLine: `- Documento "${safeName(input)}": nao foi possivel carregar (${loaded.error}).`,
    };
  }

  try {
    const text = await extractText(
      loaded.buffer,
      input.mime || loaded.mime || "application/pdf",
      safeName(input),
    );
    const extractedText = clamp(text.replace(/\s+/g, " ").trim(), MAX_EXTRACTED_TEXT);
    return {
      attachment: { ...attachment, extractedText },
      promptLine: extractedText
        ? `- Documento "${safeName(input)}" extraido: ${clamp(extractedText, 2200)}`
        : `- Documento "${safeName(input)}" nao trouxe texto extraivel. Pode ser imagem escaneada.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      attachment: { ...attachment, analysisError: message },
      promptLine: `- Documento "${safeName(input)}": falha ao extrair texto (${message}).`,
    };
  }
}

function normalizeAttachments(value: unknown): IncomingChatAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      if (
        raw.kind !== "image" &&
        raw.kind !== "audio" &&
        raw.kind !== "document"
      ) {
        return null;
      }
      if (typeof raw.url !== "string" || raw.url.length === 0) return null;
      return {
        kind: raw.kind,
        url: raw.url,
        mime: typeof raw.mime === "string" ? raw.mime : undefined,
        name: typeof raw.name === "string" ? raw.name : undefined,
        size: typeof raw.size === "number" ? raw.size : undefined,
      } satisfies IncomingChatAttachment;
    })
    .filter((item): item is IncomingChatAttachment => !!item);
}

function textWithAttachmentSummaries(
  content: string,
  attachments?: IncomingChatAttachment[],
): string {
  if (!attachments || attachments.length === 0) return content;
  const summaries = attachments.map((attachment) => {
    const name = safeName(attachment);
    if (attachment.kind === "image") return `[imagem enviada: ${name}]`;
    if (attachment.kind === "audio") return `[audio enviado: ${name}]`;
    return `[documento enviado: ${name}]`;
  });
  return [content, ...summaries].filter(Boolean).join("\n");
}

async function loadAttachmentBuffer(
  attachment: IncomingChatAttachment,
): Promise<{ ok: true; buffer: Buffer; mime?: string } | { ok: false; error: string }> {
  if (attachment.url.startsWith("data:")) {
    return parseDataUrl(attachment.url);
  }

  if (!isTrustedBlobUrl(attachment.url)) {
    return { ok: false, error: "URL fora do storage autorizado" };
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await get(pathnameFromBlobUrl(attachment.url), {
        access: "private",
      });
      if (blob && blob.statusCode === 200) {
        return {
          ok: true,
          buffer: Buffer.from(await new Response(blob.stream).arrayBuffer()),
          mime: blob.blob.contentType ?? undefined,
        };
      }
    } catch {
      // fallback para fetch abaixo
    }
  }

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    return {
      ok: true,
      buffer: Buffer.from(await response.arrayBuffer()),
      mime: response.headers.get("content-type") ?? undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function transcribeAudio(input: {
  buffer: Buffer;
  mime: string;
  filename: string;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, error: "OPENAI_API_KEY ausente para transcricao" };
  }

  const preferredModel = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
  const models = preferredModel === "whisper-1"
    ? ["whisper-1"]
    : [preferredModel, "whisper-1"];

  let lastError = "";
  for (const model of models) {
    const arrayBuffer = new ArrayBuffer(input.buffer.byteLength);
    new Uint8Array(arrayBuffer).set(input.buffer);
    const form = new FormData();
    form.append(
      "file",
      new Blob([arrayBuffer], { type: input.mime }),
      input.filename,
    );
    form.append("model", model);
    form.append("language", "pt");
    form.append("response_format", "json");

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: { message?: string };
      };
      if (response.ok && typeof data.text === "string") {
        return { ok: true, text: data.text.trim() };
      }
      lastError = data.error?.message ?? `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: false, error: lastError || "falha na transcricao" };
}

function parseDataUrl(
  url: string,
): { ok: true; buffer: Buffer; mime?: string } | { ok: false; error: string } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
  if (!match) return { ok: false, error: "data URL invalida" };
  try {
    const mime = match[1] || undefined;
    const encoded = match[3] ?? "";
    const buffer = match[2]
      ? Buffer.from(encoded, "base64")
      : Buffer.from(decodeURIComponent(encoded), "utf-8");
    return { ok: true, buffer, mime };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function isTrustedBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function pathnameFromBlobUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/+/, "");
  } catch {
    return url.replace(/^\/+/, "");
  }
}

function safeName(attachment: IncomingChatAttachment): string {
  return attachment.name?.replace(/[^\w.\- ()]/g, "").slice(0, 120) || "anexo";
}

function clamp(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}
