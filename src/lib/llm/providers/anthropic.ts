import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from "../types";

/**
 * Provider Anthropic (Claude Haiku 4.5 primário).
 * Requer ANTHROPIC_API_KEY no ambiente.
 */

export async function anthropicComplete(
  req: ChatCompletionRequest,
  modelId: string,
): Promise<ChatCompletionResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada — caia no fallback ou no mock provider",
    );
  }
  const start = Date.now();
  const system = req.messages.find((m) => m.role === "system")?.content;
  const conv = req.messages.filter((m) => m.role !== "system");

  const result = await generateText({
    model: anthropic(modelId),
    system,
    messages: conv.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    temperature: req.temperature,
    maxOutputTokens: req.maxTokens,
  });

  return {
    text: result.text,
    model: modelId as ChatCompletionResponse["model"],
    provider: "anthropic",
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    latencyMs: Date.now() - start,
  };
}

export async function* anthropicStream(
  req: ChatCompletionRequest,
  modelId: string,
): AsyncGenerator<StreamChunk> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada");
  }
  const start = Date.now();
  const system = req.messages.find((m) => m.role === "system")?.content;
  const conv = req.messages.filter((m) => m.role !== "system");

  const stream = streamText({
    model: anthropic(modelId),
    system,
    messages: conv.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
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
      model: modelId as ChatCompletionResponse["model"],
      provider: "anthropic",
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      latencyMs: Date.now() - start,
    },
  };
}
