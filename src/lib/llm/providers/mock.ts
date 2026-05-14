import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  StreamChunk,
} from "../types";

/**
 * Provider mock — usado quando nenhuma API key está configurada.
 *
 * Responde com texto plausível conforme a capability, simulando latência
 * e contagem de tokens. Permite desenvolver a UX completa do chat sem
 * gastar API.
 */

const RESPONSES: Record<string, string[]> = {
  chat_student: [
    "Boa pergunta! Antes de eu te dar uma resposta direta, deixa eu te perguntar: o que você já entendeu até aqui? Me conta com suas palavras.",
    "Hmm, vamos pensar juntos. Olha pra esses números: o que você acha que eles têm em comum?",
    "Tô vendo que você tá tentando — isso já é meio caminho. Agora, e se a gente decompusesse essa conta em duas mais simples? Como você faria?",
    "Isso aí! Mandou bem. Agora, pra eu ter certeza de que ficou claro: se eu mudasse os números, você conseguiria fazer de novo?",
  ],
  plan_generation: [
    "**Frações equivalentes** · 7º ano · 50min · EF07MA04\n\n**Abertura · 10min**\nApresentar pizza dividida em 8 e outra em 4. Provocação: \"comer 2/4 é o mesmo que comer 4/8?\"\n\n**Investigação · 25min**\nDuplas com material concreto. Encontrar 3 pares equivalentes e justificar.\n\n**Sistematização · 10min**\nConstruir coletivamente a regra: multiplicar numerador e denominador pelo mesmo número.\n\n**Avaliação · 5min**\nTicket de saída: cada aluno escreve 1 fração equivalente a 3/4.",
  ],
  bncc_classification: [
    '{"code":"EF07MA04","confidence":0.94,"area":"Matemática"}',
  ],
  sre_classification: [
    '{"severity":"none","signals":{}}',
  ],
  essay_correction: [
    "**Sugestões:**\n- **Coesão**: repetição de \"as pessoas\" no 2º parágrafo. Sugerir sinônimos.\n- **Argumentação**: argumento sobre desigualdade bem trazido, mas precisa de dado concreto.\n- **Norma**: \"houveram\" — verbo haver no sentido de existir é impessoal (houve).",
  ],
  embeddings_rag: ["[mock embedding]"],
};

function pickResponse(capability: string, seed?: string): string {
  const options = RESPONSES[capability] ?? RESPONSES.chat_student;
  if (!seed) return options[Math.floor(Math.random() * options.length)]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return options[Math.abs(hash) % options.length]!;
}

export async function mockComplete(
  req: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 350));
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const text = pickResponse(req.capability, lastUser?.content);
  return {
    text,
    model: "mock",
    provider: "mock",
    promptVersion: "mock",
    inputTokens: req.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0),
    outputTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - start,
  };
}

export async function* mockStream(
  req: ChatCompletionRequest,
): AsyncGenerator<StreamChunk> {
  const start = Date.now();
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const fullText = pickResponse(req.capability, lastUser?.content);
  const words = fullText.split(/(\s+)/);

  for (const word of words) {
    await new Promise((r) => setTimeout(r, 25 + Math.random() * 40));
    yield { type: "text", text: word };
  }

  yield {
    type: "done",
    meta: {
      model: "mock",
      provider: "mock",
      promptVersion: "mock",
      inputTokens: req.messages.reduce(
        (s, m) => s + Math.ceil(m.content.length / 4),
        0,
      ),
      outputTokens: Math.ceil(fullText.length / 4),
      latencyMs: Date.now() - start,
    },
  };
}
