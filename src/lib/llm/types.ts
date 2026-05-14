/**
 * Tipos do LLM Gateway.
 *
 * Toda chamada de IA passa por uma capability (não direto no provider).
 * Capabilities mapeiam para modelos via tabela de roteamento, permitindo
 * switch sem deploy (configurado em N7 · Observabilidade).
 */

export type Capability =
  | "chat_student"
  | "plan_generation"
  | "essay_correction"
  | "bncc_classification"
  | "embeddings_rag"
  | "sre_classification";

export type ProviderId = "anthropic" | "openai" | "google" | "mock";

export type ModelId =
  | "claude-haiku-4-5"
  | "claude-sonnet-4-6"
  | "claude-opus-4-7"
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gemini-2.5-flash"
  | "voyage-3"
  | "text-embedding-3-small"
  | "mock";

export interface CapabilityRoute {
  capability: Capability;
  provider: ProviderId;
  model: ModelId;
  promptVersion?: string;
  fallback?: { provider: ProviderId; model: ModelId };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  capability: Capability;
  messages: ChatMessage[];
  tenantId?: string;
  conversationId?: string;
  studentId?: string;
  temperature?: number;
  maxTokens?: number;
  systemContext?: Record<string, string>; // {{tutor_name}}, {{prefeitura}}, etc.
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
