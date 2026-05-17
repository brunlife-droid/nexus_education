import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, streamText } from "ai";
import type {
  ChatContent,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelId,
  StreamChunk,
} from "../types";

/**
 * Provider OpenRouter — proxy unificado para Claude, GPT, Gemini, Llama, etc.
 *
 * Requer OPENROUTER_API_KEY no ambiente. Model IDs seguem o formato
 * `<provedor>/<modelo>` (ex: "anthropic/claude-haiku-4-5").
 *
 * Vantagens vs. integração direta:
 * - Uma chave para todos os modelos
 * - Failover automático interno (configurável)
 * - Custo unificado para análise
 * - Alinha com a visão de "switch sem deploy" do N7
 */

function client() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY não configurada — fallback para mock provider",
    );
  }
  return createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    // Headers opcionais que OpenRouter usa para attribution/leaderboard:
    extraBody: {},
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://nexus-education",
      "X-Title": "Nexus Education",
    },
  });
}

function textFromContent(content: ChatContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function aiSdkContent(content: ChatContent) {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "image") {
      return {
        type: "image",
        image: part.image,
        mediaType: part.mimeType,
      };
    }
    return part;
  }) as unknown as string;
}

export async function openrouterComplete(
  req: ChatCompletionRequest,
  modelId: string,
): Promise<ChatCompletionResponse> {
  const start = Date.now();
  const openrouter = client();
  const systemMessage = req.messages.find((m) => m.role === "system");
  const system = systemMessage
    ? textFromContent(systemMessage.content)
    : undefined;
  const conv = req.messages.filter((m) => m.role !== "system");

  const result = await generateText({
    model: openrouter(modelId),
    system,
    messages: conv.map((m) => ({
      role: m.role as "user" | "assistant",
      content: aiSdkContent(m.content),
    })),
    temperature: req.temperature,
    maxOutputTokens: req.maxTokens,
  });

  return {
    text: result.text,
    model: modelId as ModelId,
    provider: "openrouter",
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    latencyMs: Date.now() - start,
  };
}

export async function* openrouterStream(
  req: ChatCompletionRequest,
  modelId: string,
): AsyncGenerator<StreamChunk> {
  const start = Date.now();
  const openrouter = client();
  const systemMessage = req.messages.find((m) => m.role === "system");
  const system = systemMessage
    ? textFromContent(systemMessage.content)
    : undefined;
  const conv = req.messages.filter((m) => m.role !== "system");

  const stream = streamText({
    model: openrouter(modelId),
    system,
    messages: conv.map((m) => ({
      role: m.role as "user" | "assistant",
      content: aiSdkContent(m.content),
    })),
    temperature: req.temperature,
    maxOutputTokens: req.maxTokens,
  });

  for await (const chunk of stream.textStream) {
    yield { type: "text", text: chunk };
  }

  const usage = await stream.usage;
  yield {
    type: "done",
    meta: {
      model: modelId as ModelId,
      provider: "openrouter",
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      latencyMs: Date.now() - start,
    },
  };
}
