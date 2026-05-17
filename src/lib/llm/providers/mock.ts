import type {
  ChatContent,
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
  exam_generation: [
    "# Prova - Matemática - 7º ano\n\n## Orientações ao aluno\nLeia com atenção, apresente os cálculos quando necessário e marque apenas uma alternativa nas questões objetivas.\n\n## Versão A\n\n1. (EF07MA04 - fácil - múltipla escolha) Qual fração é equivalente a 3/4?\nA) 6/8\nB) 5/6\nC) 7/9\nD) 9/16\n\n2. (EF07MA04 - médio - discursiva) Explique, com desenho ou cálculo, por que 2/6 e 4/12 representam a mesma quantidade.\n\n3. (EF07MA12 - médio - múltipla escolha) Em uma turma de 30 alunos, 2/5 são meninas. Quantos são meninos?\nA) 12\nB) 15\nC) 18\nD) 20\n\n## Gabarito comentado\n1. A - multiplicou numerador e denominador por 2.\n2. Espera-se identificar equivalência por simplificação ou multiplicação.\n3. C - 2/5 de 30 = 12 meninas; 18 meninos.",
  ],
  student_artifact_generation: [
    '{"title":"Revisao guiada","kind":"flashcards","cards":[{"front":"O que significa uma fracao equivalente?","back":"E uma fracao que representa a mesma parte do inteiro, mesmo com numeros diferentes.","hint":"Pense em dividir a mesma pizza em mais pedacos."},{"front":"Como criar uma fracao equivalente a 3/4?","back":"Multiplique numerador e denominador pelo mesmo numero, por exemplo 6/8.","hint":"O mesmo fator em cima e embaixo."},{"front":"Por que 2/4 e 1/2 sao equivalentes?","back":"Porque ambas representam metade do inteiro.","hint":"Simplifique 2/4 dividindo por 2."}]}',
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

function textFromContent(content: ChatContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function messageText(req: ChatCompletionRequest): string {
  return req.messages.map((m) => textFromContent(m.content)).join("\n");
}

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
  const text = pickResponse(
    req.capability,
    lastUser ? textFromContent(lastUser.content) : undefined,
  );
  return {
    text,
    model: "mock",
    provider: "mock",
    promptVersion: "mock",
    inputTokens: Math.ceil(messageText(req).length / 4),
    outputTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - start,
  };
}

export async function* mockStream(
  req: ChatCompletionRequest,
): AsyncGenerator<StreamChunk> {
  const start = Date.now();
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const fullText = pickResponse(
    req.capability,
    lastUser ? textFromContent(lastUser.content) : undefined,
  );
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
      inputTokens: Math.ceil(messageText(req).length / 4),
      outputTokens: Math.ceil(fullText.length / 4),
      latencyMs: Date.now() - start,
    },
  };
}
