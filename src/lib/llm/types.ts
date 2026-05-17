/**
 * Tipos do LLM Gateway.
 *
 * Toda chamada de IA passa por uma capability (não direto no provider).
 * Capabilities mapeiam para modelos via tabela de roteamento, permitindo
 * switch sem deploy (configurado em N7 · Observabilidade).
 *
 * Provider primário é OpenRouter, que dá acesso unificado a Claude, GPT,
 * Gemini, Llama etc. com uma única chave. ModelId segue a convenção
 * `<provider>/<model>` do OpenRouter.
 */

export type Capability =
  | "chat_student"
  | "student_artifact_generation"
  | "plan_generation"
  | "exam_generation"
  | "essay_correction"
  | "bncc_classification"
  | "embeddings_rag"
  | "sre_classification";

export type ProviderId = "openrouter" | "openai" | "mock";

/**
 * IDs aceitos pelo OpenRouter (https://openrouter.ai/models).
 * Embeddings continuam direto na OpenAI (OpenRouter não roda embeddings).
 */
export type ModelId =
  | "anthropic/claude-haiku-4-5"
  | "anthropic/claude-sonnet-4-6"
  | "anthropic/claude-opus-4-7"
  | "openai/gpt-4o-mini"
  | "openai/gpt-4o"
  | "google/gemini-2.5-flash"
  | "meta-llama/llama-3.3-70b-instruct"
  | "text-embedding-3-small"
  | "mock";

export interface CapabilityRoute {
  capability: Capability;
  provider: ProviderId;
  model: ModelId;
  promptVersion?: string;
  fallback?: { provider: ProviderId; model: ModelId };
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string };

export type ChatContent = string | ChatContentPart[];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatContent;
}

export interface ChatCompletionRequest {
  capability: Capability;
  messages: ChatMessage[];
  tenantId?: string;
  conversationId?: string;
  studentId?: string;
  temperature?: number;
  maxTokens?: number;
  systemContext?: Record<string, string>;
}

export interface ChatCompletionResponse {
  text: string;
  model: ModelId;
  provider: ProviderId;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface StreamChunk {
  type: "text" | "done" | "error";
  text?: string;
  error?: string;
  meta?: Omit<ChatCompletionResponse, "text">;
}
