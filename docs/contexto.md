# Contexto atual

> **Atualizar este arquivo sempre que o estado do projeto mudar.** Foto rápida do que está pronto, o que está em andamento e o que ainda não foi tocado.
>
> Última atualização: 2026-05-16 (P4 prova real + artefatos do professor)

---

## Estado de produção (Vercel + Neon)

- **Deploy alvo**: `claude-code-teste.vercel.app` (projeto `claude-code-teste` na org `brunlife-6820's`).
- **Branch deployada**: `main`. PR #1 (`feat: tutora socrática v4.3 + RAG + admin LLM`) foi mergeado (squash) em `25dffd4` em 2026-05-15.
- **Banco Neon**: projeto `nexus-education` em `AWS South America East 1 (São Paulo)`. Migration `0001_class_materials_focus_and_llm_config.sql` aplicada via SQL Editor do Neon — validado que `class_focus_skills`, `llm_routes`, `system_prompts` e coluna `documents.class_id` existem.
- **Env vars configuradas na Vercel** (Production):
  - `DATABASE_URL` ✅
  - `OPENROUTER_API_KEY` ✅
  - `OPENAI_API_KEY` ✅ (adicionada em 2026-05-15 — embeddings do RAG)
  - `NEXTAUTH_URL` ✅
  - `NEXTAUTH_SECRET` ✅
- **Pendente pra fechar produção**:
  - `BLOB_READ_WRITE_TOKEN` ✅ (`nexus-materials`, Blob privado em GRU1)
  - Validação end-to-end: subir material real, conversar com a tutora pra confirmar que ela usa o trecho RAG.
- **Teste de produção em 2026-05-16**:
  - Home e `/entrar` responderam `200 OK`.
  - Login demo professor/aluno funcionou; `/professor`, `/aluno/chat` e `/aluno/historico` abriram autenticadas.
  - `/api/llm-health` respondeu com OpenRouter real (`anthropic/claude-haiku-4-5`, `sample: "pong"`).
  - Rotas SSE (`/api/chat`, `/api/lesson-plan`, `/api/essay-correction`) foram corrigidas e validadas em produção com respostas `200 OK`. Elas agora usam `complete()` + `createBufferedSseResponse()` e mantêm o contrato de linhas `data: ...` consumido pelo frontend.
  - Bruno já pode testar login, chat do aluno, copiloto do professor, correção de redação e gerador de prova em produção. Upload de material usa Vercel Blob privado (`nexus-materials`).

---

## O que está funcional hoje

- Scaffolding Next.js 16 + React 19 + TypeScript + Tailwind v4
- Drizzle + Neon Postgres com pgvector + migrations aplicadas
- LLM gateway via OpenRouter (Claude Haiku 4.5 primário) — `src/lib/llm/`
- NextAuth v5 com credenciais demo + página de login
- Storage abstrato + Vercel Blob (upload de foto no chat)
- Scaffolding visual ainda contém mocks em várias telas de Aluno, Professor, Secretaria e Admin
- Multi-tenant foundation (middleware + tabela `tenants` + tokens CSS por tenant)
- Deploy Vercel forçado em `gru1` (São Paulo)
- **Loop do Aluno completo**: chat A2 persiste no DB (conversations + messages), histórico A3 lê do Postgres com agrupamento por data, `?id=` reabre conversa antiga. Graceful sem `DATABASE_URL` (cai pra modo efêmero).
- **Auth real enforced**: `/aluno`, `/professor`, `/secretaria`, `/admin` exigem sessão via `requireRole(...)` no layout. `/api/chat` retorna 401/403 sem sessão. Login redireciona por papel pra `getLayerHomePath(role)`. Ownership de conversation validada por `studentId` da sessão (não mais teatro). As áreas autenticadas têm botão "Sair" no shell, com logout via NextAuth e retorno para `/entrar`.
- **Tenants do DB**: `getCurrentTenant()` lê do Postgres com seed idempotente das 3 prefeituras. Fallback in-code se não houver `DATABASE_URL`. White-label dinâmico funciona (`?tenant=pousoalegre` muda cores/nome do tutor).
- **Seed da rede (Alfenas 7º A)**: usuários demo (incluindo João antes da FK de aluno), 3 demo non-students (Ricardo prof, Cláudia sec, Bruno admin) + memberships idempotentes com update explícito de escopo; `loadTeacherContext()` também repara/faz fallback do vínculo demo do Ricardo se o Neon estiver com row antiga. Há 12 alunos no 7º A (João linkado ao user), 9 habilidades BNCC e proficiência por aluno×habilidade.
- **Dashboard P1 do Professor real**: KPIs (engajados na semana, em risco por proficiência <0.45, total na turma) e destaques (top 3 por avg proficiency) vêm do DB. Alertas, próximas aulas e ferramentas LLM ainda mockados.
- **P5 Dashboard da Turma real**: heatmap students × habilidades BNCC + lista ordenada por proficiência + KPIs reais; para a turma demo `class-demo-7a`, há fallback de 12 alunos/9 habilidades se o Neon retornar vazio ou parcial. Ao marcar foco pedagógico ou gerar token de upload, a action/API garantem tenant/escola/turma/habilidades demo antes de gravar; `setBy`/`uploadedBy` são omitidos se o usuário demo não existir no DB, evitando FK quebrada.
- **S1 Dashboard da Secretaria real**: KPIs da rede inteira (total alunos, engajados 7d, profs/turmas/escolas, em risco, proficiência média) vêm do DB. IDEB e indicadores Nexus em baixo ainda mockados (gov data que não temos).
- **P2 Copiloto LLM**: `/professor/copiloto` gera plano de aula via Claude Haiku 4.5/OpenRouter, fallback mock. Form (disciplina/série/tema/duração) → linhas `data: ...` → Markdown render com cursor blinking. Resultado grava artefato best-effort em `audit_log`.
- **P3 Correção de redação**: `/professor/correcao` analisa texto colado nas 5 competências ENEM (GPT-4o-mini via OpenRouter, fallback Haiku). Form com nome do aluno + tema + textarea + botão. Resultado grava artefato best-effort em `audit_log`.
- **P4 Gerador de prova real**: `/professor/provas` chama `/api/exam-generation` via capability `exam_generation`, gerando prova com matriz BNCC, versões e gabarito comentado. Permite copiar ou baixar `.md`; grava artefato best-effort em `audit_log`.
- **Tutora v4.3 socrática + RAG da turma**: prompt do `chat_student` reescrito com regras explícitas de não entregar resposta antes do aluno tentar. Slots `{{foco_pedagogico}}` (de `class_focus_skills`) e `{{contexto_material}}` (top-3 chunks via pgvector) injetados pelo `/api/chat`. Sem material relevante → tutora segue com base ampla.
- **Material da turma no `/professor/turma`**: card com multi-select de habilidades BNCC pra foco + upload (PDF/DOCX/TXT/MD até 50MB) com status (pendente/processando/pronto/falhou) e remoção. Upload direto pro Vercel Blob via signed URL (`@vercel/blob/client`); `/api/material/process` extrai texto + chunks + embeddings (`text-embedding-3-small`).
- **Config macro LLM no admin**: `/admin/configuracoes/llm` (papel `admin_nexus`) edita provider/modelo/temperature/maxTokens/fallback por capability e prompts versionados. Mudanças aplicam imediatamente (gateway lê DB com cache por request). Cai no fallback hardcoded sem DB ou sem registro.

## O que está mockado / não funcional ainda

- Contagens (`students`, `teachers`, `schools`) do Tenant ainda vêm do in-code overlay — DB não tem agregados
- RLS escrita no SQL mas conexão atual bypassa (queries rodam como owner; políticas existem mas não enforçam)
- P6 (perfil aluno) e P7 (diário): mockados
- Biblioteca da rede ainda é majoritariamente mock, mas já sabe mostrar "Gerados por mim" quando houver artefatos LLM no `audit_log`
- Persistência de planos/provas/correções ainda usa `audit_log` como trilha best-effort; falta tabela dedicada para editar, compartilhar, versionar e buscar artefatos
- Telas Secretaria S2-S9 e Admin N2-N7/N9: mockadas (N8 e N8b agora reais)
- IDEB gráfico e Indicadores Nexus na S1 seguem com dados do mock
- WhatsApp, OCR, áudio: nada começado (PDF e RAG agora funcionais via /professor/turma)
- `audit_log`: já recebe artefatos LLM do professor; ainda faltam writes para todas as ações sensíveis. `consent_log` segue sem fluxo implementado.
- Override de config LLM por tenant (hoje só macro global)
- Reprocessamento manual de material que falhou (não tem botão "tentar de novo")
- Mostrar "fonte" usada pela tutora abaixo da resposta no chat do aluno (transparência)
- Busca/filtros do histórico A3 são UI estática (não filtram nada ainda)

## Próximos passos sugeridos (em discussão)

Ver `docs/ROADMAP.md` Fase 1 — o foco natural agora é fechar o loop do Aluno (chat real + persistência + histórico do DB).

## Decisões em aberto

Ver `docs/ROADMAP.md` seção 5 ("Decisões críticas pendentes").

## Gotchas / pegadinhas

- **Next.js 16 ≠ Next.js 14**. Convenção `middleware` foi renomeada pra `proxy`. Ler `node_modules/next/dist/docs/` antes de mexer em rotas, middleware, ou config.
- **Sempre filtrar por `tenantId`**. Nunca escrever query sem isso. RLS é a segunda barreira, não a primeira.
- **LLM nunca direto do componente**. Tudo via `src/lib/llm/gateway.ts`.
