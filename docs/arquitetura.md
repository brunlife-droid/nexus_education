# Arquitetura

> **Atualizar sempre que uma decisão arquitetural mudar** — nova abstração, nova camada, novo provider, refator estrutural. Não duplicar o ROADMAP; aqui é o **estado real do código**, não o plano.
>
> Última atualização: 2026-05-16

---

## Stack em uso

| Camada | Tecnologia | Onde mora |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | raiz |
| UI | React 19 + Tailwind v4 + CSS vars semânticas | `src/app/`, `src/components/` |
| DB | Postgres (Neon serverless) + pgvector | `drizzle/migrations/` |
| ORM | Drizzle | `src/lib/db/` |
| Auth | NextAuth v5 (credenciais demo por enquanto) | `src/lib/auth/` |
| LLM gateway | Vercel AI SDK + OpenRouter | `src/lib/llm/` |
| Storage | Vercel Blob via abstração | `src/lib/storage/` |
| Hosting | Vercel (região `gru1` — São Paulo) | `vercel.json` |

## Estrutura de pastas

```
src/
  app/                # rotas (App Router)
    aluno/            # área Aluno (A1-A6)
    professor/        # área Professor (P1-P8)
    secretaria/       # área Secretaria (S1-S9)
    admin/            # área Admin Nexus (N2-N9)
    login/
    api/              # API routes
  components/         # UI compartilhada
  lib/
    db/               # Drizzle schema + cliente + seed-demo
    chat/             # persistência de conversations/messages
    student/          # queries/actions/artefatos do aluno
    llm/              # gateway + providers + capabilities + prompts
    auth/             # NextAuth config
    storage/          # abstração Vercel Blob
    tenants/          # middleware helpers + config
  middleware.ts       # ⚠️ em Next 16 será migrado para `proxy.ts`
drizzle/migrations/   # SQL versionado
docs/                 # ROADMAP, contexto, arquitetura, histórico
.claude/
  settings.json       # config do Claude Code (commitado) — hooks e sandbox
  hooks/              # scripts dos hooks (commitados, chmod +x)
```

## Continuidade entre sessões (hooks do Claude Code)

Pra garantir que cada nova sessão de Claude nesse repo arranque com o contexto certo e termine deixando rastro, o `.claude/settings.json` define dois hooks:

- **`SessionStart`** roda `.claude/hooks/inject-docs.sh` no início de toda sessão. O script lê `docs/{contexto,arquitetura,historico}.md` e devolve via `hookSpecificOutput.additionalContext` — o conteúdo entra no contexto do modelo como mensagem de sistema, antes do primeiro turno. Garante que ninguém esquece de ler os docs vivos.
- **`Stop`** roda `.claude/hooks/check-historico.sh` quando o agente tenta parar. Se `git diff` mostrar mudanças em `src/`, `drizzle/migrations/` ou `package*.json` sem alteração em `docs/historico.md`, retorna `{"decision":"block",...}` e força o modelo a continuar trabalhando até atualizar o histórico.

O `CLAUDE.md` continua sendo a documentação humana do workflow; os hooks são o cinto de segurança técnico.

## Decisões arquiteturais ativas

### Multi-tenancy
- **Single Postgres + `tenant_id` em todas as tabelas + Postgres RLS** como segunda barreira (políticas estão no SQL mas conexão atual bypassa — pendente).
- **Não** schema-per-tenant.
- Resolução de tenant por subdomínio em prod (`alfenas.nexus.edu`), por path/header em dev.
- `getCurrentTenant()` (em `src/lib/tenants/server.ts`) carrega a row do Postgres via `loadTenantFromDb()` (cacheado por request com `cache()` do React). `ensureTenantsSeeded()` faz o INSERT idempotente das 3 prefeituras no primeiro hit por instância.
- Sem `DATABASE_URL` ou row inexistente: cai pra `TENANTS` in-code (mesmo shape `Tenant`) — dev sem DB continua funcionando.
- Campos derivados (`population`, `students`, `teachers`, `schools`) ainda vêm do overlay in-code até COUNT real existir.

### LLM gateway
- Tudo passa por `src/lib/llm/gateway.ts`. Componentes nunca chamam OpenRouter direto.
- Roteamento por **capability** (chat, artefatos do aluno, plano, prova, correção, embeddings), não por modelo direto. Permite trocar provider sem deploy.
- Observability (tokens, latência, custo por tenant) passa pelo gateway.

### White-label
- CSS vars semânticas injetadas via `<style>` no layout raiz, lidas da tabela `tenants`.
- Sem rebuild por tenant.

### Auditoria
- `audit_log` e `consent_log` são tabelas obrigatórias. Toda ação sensível vira log (acesso a dado de aluno, envio de mensagem, alerta SRE).

### Persistência de chat (Aluno)
- `src/lib/chat/persistence.ts` é a única porta de entrada pra `conversations`/`messages`. Componentes nunca tocam Drizzle direto.
- Todas as funções são **graceful**: sem `DATABASE_URL` retornam `null`/`[]` sem propagar erro — o chat continua streamando em modo efêmero.
- IDs gerados com `crypto.randomUUID()` no app (nunca no DB). Convenção do schema (`text PK`).
- A API `/api/chat` envia chunk SSE `{ type: "meta", conversationId }` no início do stream pra o cliente atualizar URL via `history.replaceState` — refresh preserva a conversa.
- Quando o RAG encontra trechos de material da turma, `/api/chat` também envia `{ type: "sources", sources }`. A mensagem da tutora persiste essa metadata em `messages.attachments` com `kind="source"`, para a conversa reaberta continuar mostrando as fontes usadas.
- Mensagens do aluno também podem persistir anexos multimodais em `messages.attachments` (`kind="image"|"audio"|"document"` com `url`, `mime`, `name`, `size` e, quando houver, `transcript`/`extractedText`). A UI reabre previews e a API usa essa metadata para artefatos de estudo.
- `/aluno/historico` usa `listConversations()` e aplica filtros leves via search params (`q` e `area`) no Server Component, mantendo URL compartilhável sem estado client-side.
- Ownership de conversation validado por `studentId` derivado da sessão antes de retomar (`?id=`) ou continuar via API (proteção contra IDOR).

### Contexto do aluno (A1/A4/A5/A6)
- `src/lib/student/queries.ts` centraliza leitura das telas do aluno: perfil/onboarding, trilha BNCC, acessibilidade e mural. Todas as queries são graceful e filtradas por `tenantId` + `studentId` resolvido da sessão.
- `src/lib/student/actions.ts` concentra mutações do aluno via Server Actions: onboarding/consentimento, preferência de acessibilidade e leitura de recados. Ações sensíveis escrevem `audit_log` best-effort.
- A1 grava `students.nickname` e insere linha em `consent_log` com escopos de tutoria, memória pedagógica, RAG da turma e escalonamento SRE.
- A4 calcula a trilha a partir de `student_proficiency` + `habilities`, agrupando por área BNCC e escolhendo próximo passo pelo menor score.
- A6 persiste um único modo em `students.a11y_mode` (`none`, `easy-read`, `dyslexia`, `tdah`). Preferências mais finas exigem coluna/tabela própria futura.
- A5 usa as novas tabelas `student_announcements` e `student_announcement_reads` (migration `0002_student_announcements.sql`) para recados por tenant/escola/turma e confirmação de leitura. Como a migration pode ainda não existir em produção, o mural cai para recados demo e persiste leitura em `audit_log` para manter o fluxo testável.

### Auth + autorização
- NextAuth v5 (Credentials provider com whitelist demo enquanto `DATABASE_URL` não tem users seedados).
- **Server**: `src/lib/auth/session.ts` exporta `requireAuth()` e `requireRole(...)` — Server Components/layouts chamam isso no topo. Não logado vira redirect pra `/entrar?callbackUrl=<x-pathname>`; papel errado vira redirect pra própria home do papel (`getLayerHomePath`).
- **Client**: `src/lib/auth/session-paths.ts` é client-safe (sem `next/headers`, sem `redirect`) — login form importa daqui pra computar destino pós-signIn.
- **Logout no shell**: `src/components/shell/logout-button.tsx` chama `signOut()` no client e redireciona para `/entrar`. `Sidebar`/`AlunoSidebar` renderizam o botão no rodapé das áreas protegidas.
- **API routes**: chamam `auth()` direto + retornam 401/403 conforme caso. Ex: `/api/chat`.
- **Mapa de papéis → home**: `aluno/responsavel → /aluno/chat`, `professor/coordenador/diretor/orientador → /professor`, `secretaria → /secretaria`, `admin_nexus → /admin`.
- **Resolução de `studentId`** centralizada em `src/lib/db/student-resolver.ts` — para o demo `u-joao`, dispara seed idempotente; pros demais, lookup em `students` por `(userId, tenantId)`. Retorna `null` se nada bater — chamador trata como efêmero.

### Headers do middleware
`src/middleware.ts` injeta dois headers em toda request: `x-tenant-id` (tenant resolvido) e `x-pathname` (path original) — Server Components leem via `headers()`.

### Queries por papel (Aluno / Professor / Secretaria / Admin)
Pra evitar Server Components fazerem Drizzle direto, cada área tem um módulo de queries:
- `src/lib/student/queries.ts`: `loadStudentContext`, `loadStudentLearningPath`, `loadStudentAnnouncements`.
- `src/lib/teacher/queries.ts`: `loadTeacherContext`, `loadDashboardKpis`, `loadTeacherAlerts`, `loadTopStudents`, `loadClassHeatmap`, `loadClassRoster`, `loadStudentProfile`, `scoreToProficiency`.
- `src/lib/secretaria/queries.ts`: `loadNetworkKpis`, `loadSchoolsHealth`.
- `src/lib/admin/queries.ts` (futuro).

Todas as queries seguem o mesmo contrato: graceful (sem DATABASE_URL → retorno vazio), `ensureNetworkSeeded()` chamado no entry point pra garantir dado demo.
Exceção controlada de demo: `loadTeacherContext()` repara/faz fallback do vínculo `u-ricardo` → `class-demo-7a` quando o Neon estiver com membership antigo sem `class_id`; as queries de roster/heatmap/habilidades também usam ou mesclam os mocks demo se o DB retornar vazio/parcial para essa turma, para não bloquear a validação de produção.
- `/professor/alunos` usa `loadStudentProfile({ tenantId, classIds, studentId })`, então o perfil só abre alunos das turmas vinculadas ao usuário pedagógico logado. A tela evita exibir PII familiar sem fluxo consentido e se limita ao escopo pedagógico já persistido.
- `/professor/diario` ainda não tem tabela própria; ele deriva um rascunho pedagógico de `loadClassRoster`, `loadClassFocus` e `loadClassMaterials`, e explicita na UI que salvar/editar/assinar diário fica pendente.
- `/professor` usa `loadTeacherAlerts()` para derivar alertas de risco, pendência de engajamento e conquista a partir do roster real da turma, sem tabela nova e sempre filtrado por `tenantId` + `classIds`.

### Capabilities LLM ativas
Cada capability tem rota e prompt versionado. **Em runtime, o gateway lê a rota e o prompt ativos do DB via `src/lib/llm/config.ts`**, caindo no hardcoded (`routes.ts`/`prompts/*.ts`) quando o DB não tem registro ou está indisponível. Isso permite editar config (provider, modelo, temperature, maxTokens, prompt) **sem deploy** pela tela `/admin/configuracoes/llm`.

| Capability | Modelo primário | Prompt | API route |
| --- | --- | --- | --- |
| `chat_student` | claude-haiku-4-5 | `student-tutor.ts` v4.3 (socrático reforçado + slots RAG) | `/api/chat` |
| `student_artifact_generation` | claude-haiku-4-5 | `student-artifacts.ts` v1.0 (JSON de estudo ativo) | `/api/student-artifacts` |
| `plan_generation` | claude-haiku-4-5 | `lesson-plan.ts` v1.0 | `/api/lesson-plan` |
| `exam_generation` | claude-haiku-4-5 | `exam-generation.ts` v1.0 | `/api/exam-generation` |
| `essay_correction` | gpt-4o-mini | `essay-correction.ts` v1.0 | `/api/essay-correction` |
| `bncc_classification` | claude-haiku-4-5 | (pendente) | (pendente) |
| `sre_classification` | claude-haiku-4-5 | (pendente) | (pendente) |
| `embeddings_rag` | text-embedding-3-small (OpenAI direto) | (não usa prompt) | usado em `rag/retrieve.ts` e `rag/extract.ts` |

Convenção pra nova capability: 1) adicionar rota em `routes.ts` (fallback hardcoded), 2) criar prompt versionado em `prompts/`, 3) atualizar `HARDCODED_PROMPTS` em `config.ts`, 4) criar route handler `/api/<capability>` que valida sessão e papel e usa `complete()` do gateway com resposta em linhas `data: ...`. A tela admin lista a nova capability automaticamente.

### RAG da turma (material do professor)
- **Schema**: `documents` ganhou `class_id` + `kind` (`class_material` | `national_library`) + `status` (`pending`|`processing`|`ready`|`failed`); `chunks` tem `embedding vector(1536)` + índice HNSW (migration 0001).
- **Upload**: client uploads do `@vercel/blob/client` com `access: "private"` — browser PUT direto na Blob privada (`nexus-materials`) com token assinado por `/api/material/upload`. Teto 50MB no token; arquivo grande nunca passa por função do servidor (bypassa limite de 4.5MB).
- **Processamento**: `/api/material/process` baixa o blob, extrai texto (`pdf-parse`/`mammoth`/texto puro), chunka (1800c + 200c overlap), embedda em lotes de 32 via `text-embedding-3-small`, persiste em `chunks`. `maxDuration = 300`s. Idempotente por `documentId`; quando chamado pelo navegador, valida papel pedagógico e tenant do documento antes de processar. Materiais `failed` podem ser reprocessados pelo painel da turma.
- **Retrieve em conversa**: `rag/retrieve.ts` embedda a última pergunta do aluno e busca top-3 chunks da turma do aluno por cosine distance (threshold 0.35). `rag/context.ts` formata os slots `{{foco_pedagogico}}` (de `class_focus_skills`) e `{{contexto_material}}` que o prompt v4.3 espera, além de devolver as fontes estruturadas usadas pela UI. `/api/chat` faz isso antes de chamar `complete()` e devolver linhas `data: ...` para o frontend.
- **Foco pedagógico**: `class_focus_skills` é a lista de habilidades BNCC marcadas pela profe em `/professor/turma` (multi-select). O painel salva via `/api/class-focus`, rota JSON autenticada por papel pedagógico. Vão pro prompt como prioridade — a tutora ainda responde sobre outros temas, só dá preferência a esses.
- Para demo resiliente, `setClassFocus()` garante tenant/escola/turma demo e as habilidades BNCC conhecidas no DB antes de inserir `class_focus_skills`; `/api/material/upload` também garante tenant/turma demo antes de emitir token. `setBy`/`uploadedBy` só são preenchidos quando o usuário da sessão existe no DB, evitando FK quebrada por conflito legado de seed.

### Chat multimodal do aluno
- O contrato client → `/api/chat` agora envia `messages[]` com `attachments[]` estruturados (`image`, `audio`, `document`). O componente `ChatClient` só faz upload para `/api/upload`; análise acontece no servidor.
- `src/lib/chat/multimodal.ts` prepara a última mensagem do aluno antes do gateway:
  - Imagem: baixa do Vercel Blob privado (ou data URL mock), converte para data URL até 7MB e envia ao AI SDK como parte `image`.
  - Áudio: baixa do Blob e chama `POST /v1/audio/transcriptions` da OpenAI, com `OPENAI_TRANSCRIPTION_MODEL` opcional e fallback para `whisper-1`.
  - Documento: baixa e extrai texto via `extractText()` (`pdf-parse`, `mammoth` ou texto puro), limitando o contexto enviado à LLM.
- `/api/chat` continua retornando resposta bufferizada no mesmo contrato SSE (`data: ...`), mas registra anexos analisados em `audit_log` com `action='student.chat.attachment_analyze'`.
- URLs arbitrárias não são baixadas: o processamento só aceita data URL ou host `blob.vercel-storage.com`, evitando SSRF no backend.

### Artefatos de estudo do aluno
- `src/lib/student/artifacts.ts` centraliza leitura/gravação dos artefatos do aluno em `audit_log` (`action='student_artifact.create'`). É uma persistência MVP sem migration nova; tabela dedicada continua desejável para busca, edição e compartilhamento.
- `/api/student-artifacts` valida sessão de aluno/responsável, monta contexto por `topic` ou conversa persistida do próprio `studentId`, chama `complete()` com `student_artifact_generation` e normaliza JSON para três contratos: `flashcards`, `quiz`, `summary`.
- `/aluno/estudo` é a UI interativa: cartões viráveis, quiz com alternativas/explicação e resumo guiado com passos de estudo. O chat linka para essa página passando `conversationId` quando já existe conversa persistida.

### Artefatos do professor
- Planos, correções de redação e provas gerados pelo LLM gravam uma trilha best-effort em `audit_log` com `action='teacher_artifact.create'`, `target_type='teacher_artifact'` e `metadata` contendo `actorUserId`, `kind`, `title`, parâmetros, conteúdo limitado e metadados do modelo.
- `src/lib/teacher/artifacts.ts` centraliza gravação e leitura desses artefatos. Sem `DATABASE_URL` ou com falha de DB, a geração segue funcionando e apenas não persiste.
- `/professor/biblioteca` lê os últimos artefatos do usuário logado e mostra a seção "Gerados por mim". Isso é ponte de MVP; uma tabela dedicada continua sendo o caminho correto para edição, compartilhamento, busca e versionamento.

### Configuração macro LLM (admin)
- **Tabelas**: `llm_routes` (PK = capability, uma rota ativa por capability) e `system_prompts` (versionado, índice único parcial garante 1 ativa por capability).
- **Loader**: `src/lib/llm/config.ts` exporta `loadRoute()` e `loadActivePrompt()` cacheados por request via React `cache()`. DB → fallback hardcoded.
- **Editor**: `/admin/configuracoes/llm` (`requireRole("admin_nexus")`). Edição de prompt **sempre cria nova versão** (anti-foot-gun); ativar é passo separado. Apagar versão ativa é bloqueado. "Ativar hardcoded" = desativar todas do DB pra capability, gateway cai no fallback.

## Convenções de código

- TS strict. Variáveis e identificadores em inglês; strings de UI em pt-BR.
- Server Actions preferidas sobre API routes para mutações dentro do app.
- Nunca query sem `tenantId` explícito ou via helper que injeta.
- Commits em pt-BR, imperativo, descritivo (ver `git log` recente).

## Pontos de atenção / dívida técnica

- `src/middleware.ts` precisa virar `proxy.ts` (deprecação Next 16).
- RLS escrita no SQL mas sem testes que validem isolamento.
- Mock data ainda em várias telas — migrar pra DB conforme features fecham.
