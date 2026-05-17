# Contexto atual

> **Atualizar este arquivo sempre que o estado do projeto mudar.** Foto rápida do que está pronto, o que está em andamento e o que ainda não foi tocado.
>
> Última atualização: 2026-05-17 (Railway preparado em paralelo)

---

## Estado de produção (Vercel + Neon)

- **Deploy alvo**: `claude-code-teste.vercel.app` (projeto `claude-code-teste` na org `brunlife-6820's`).
- **Branch deployada**: `main`. PR #1 (`feat: tutora socrática v4.3 + RAG + admin LLM`) foi mergeado (squash) em `25dffd4` em 2026-05-15.
- **Banco Neon**: projeto `nexus-education` em `AWS South America East 1 (São Paulo)`. Migration `0001_class_materials_focus_and_llm_config.sql` aplicada via SQL Editor do Neon — validado que `class_focus_skills`, `llm_routes`, `system_prompts` e coluna `documents.class_id` existem. Migration `0002_student_announcements.sql` foi adicionada ao repo para mural real; enquanto ela não for aplicada no Neon, a leitura dos recados demo cai em fallback via `audit_log`. Migration `0003_artifacts_diary_and_rls.sql` cria `student_artifacts`, `teacher_artifacts` e `pedagogical_diary_entries`; o código já tenta usar essas tabelas primeiro e cai para `audit_log` enquanto o SQL não estiver aplicado.
- **Env vars configuradas na Vercel** (Production):
  - `DATABASE_URL` ✅
  - `OPENROUTER_API_KEY` ✅
  - `OPENAI_API_KEY` ✅ (adicionada em 2026-05-15 — embeddings do RAG)
  - `NEXTAUTH_URL` ✅
  - `NEXTAUTH_SECRET` ✅
- **Pendente pra fechar produção**:
  - Railway Bucket/S3 ✅ (`functional-holder`, endpoint `https://t3.storageapi.dev`, ligado ao app com variáveis AWS)
  - Aplicar `drizzle/migrations/0003_artifacts_diary_and_rls.sql` no Neon para tirar artefatos do fallback em `audit_log`.
  - Validação end-to-end: subir material real, conversar com a tutora pra confirmar que ela usa o trecho RAG.
- **Migração Railway em paralelo**:
  - Repositório GitHub conectado no projeto Railway `dynamic-essence` / ambiente `production`.
  - `railway.json` define build, pre-deploy migrations e start command para Railway.
  - Cliente Drizzle migrou para `pg`/Node Postgres, compatível com Railway Postgres e ainda compatível com Neon via `sslmode=require`/`DATABASE_SSL=true`.
  - Script `npm run db:deploy` roda `0000_prepare_pgvector_and_rls.sql`, `drizzle-kit push --force` e depois aplica SQL pós-schema (`0001`, `0002`, `0003`, `9999`) de forma idempotente.
  - Railway já tem PostgreSQL, `DATABASE_URL`, `DATABASE_SSL=false`, chaves de IA/Auth, domínio público e bucket S3 ligados ao serviço `nexus_education`. Falta validar o deploy Railway completo depois do push.
- **Teste de produção em 2026-05-16**:
  - Home e `/entrar` responderam `200 OK`.
  - Login demo professor/aluno funcionou; `/professor`, `/aluno/chat` e `/aluno/historico` abriram autenticadas.
  - `/api/llm-health` respondeu com OpenRouter real (`anthropic/claude-haiku-4-5`, `sample: "pong"`).
  - Rotas SSE (`/api/chat`, `/api/lesson-plan`, `/api/essay-correction`) foram corrigidas e validadas em produção com respostas `200 OK`. Elas agora usam `complete()` + `createBufferedSseResponse()` e mantêm o contrato de linhas `data: ...` consumido pelo frontend.
  - Bruno já pode testar login, chat do aluno, copiloto do professor, correção de redação e gerador de prova em produção. Upload de material agora está preparado para Railway Bucket/S3 privado.
- **Teste de produção em 2026-05-17**:
  - Deploy `8fefb7c` ficou verde na Vercel.
  - `/aluno/estudo` abriu autenticada com o menu "Estudo ativo" e recarregou artefatos persistidos.
  - `/api/student-artifacts` gerou cartões, quiz e resumo guiado com OpenRouter real.
  - `/api/upload` aceitou PNG, TXT e WAV no Blob privado; `/api/chat` analisou imagem + documento + áudio juntos e respondeu `200 OK` com base nos três anexos.

---

## O que está funcional hoje

- Scaffolding Next.js 16 + React 19 + TypeScript + Tailwind v4
- Drizzle + Neon Postgres com pgvector + migrations aplicadas
- LLM gateway via OpenRouter (Claude Haiku 4.5 primário) — `src/lib/llm/`
- NextAuth v5 com credenciais demo + página de login
- Storage abstrato + Railway Bucket/S3 privado (chat, áudio, documentos e materiais da turma)
- Scaffolding de conteúdo ainda contém mocks em várias telas de Aluno, Professor, Secretaria e Admin
- Multi-tenant foundation (middleware + tabela `tenants` + tokens CSS por tenant)
- **Design system visual revitalizado**: tokens globais, shells, cards, botões, badges, chips e cabeçalhos agora usam superfícies mais luminosas, washes da marca do tenant e acentos de área para reduzir a sensação de app cinza sem perder tom institucional.
- **Respostas da IA renderizadas como Markdown seguro**: `LlmMarkdown` centraliza negrito, listas, tabelas, links e blocos de código para chat do aluno, estudo ativo e artefatos do professor, sem aceitar HTML bruto vindo da LLM.
- Deploy Vercel forçado em `gru1` (São Paulo)
- **Loop do Aluno completo**: chat A2 persiste no DB (conversations + messages), histórico A3 lê do Postgres com agrupamento por data e filtros reais por `?q=`/`?area=`, `?id=` reabre conversa antiga. Graceful sem `DATABASE_URL` (cai pra modo efêmero).
- **Área do Aluno A1/A4/A5/A6 real**: `/aluno/onboarding` lê dados reais do aluno/escola/turma, grava apelido em `students.nickname` e consentimento em `consent_log`; `/aluno/trilha` calcula progresso por `student_proficiency` + `habilities`; `/aluno/acessibilidade` persiste `students.a11yMode`; `/aluno/mural` lê recados tenant/school/class de `student_announcements` e registra leitura em `student_announcement_reads`, com fallback auditável em `audit_log` enquanto a migration 0002 não estiver aplicada.
- **Auth real enforced**: `/aluno`, `/professor`, `/secretaria`, `/admin` exigem sessão via `requireRole(...)` no layout. `/api/chat` retorna 401/403 sem sessão. Login redireciona por papel pra `getLayerHomePath(role)`. Ownership de conversation validada por `studentId` da sessão (não mais teatro). As áreas autenticadas têm botão "Sair" no shell, com logout via NextAuth e retorno para `/entrar`.
- **Tenants do DB**: `getCurrentTenant()` lê do Postgres com seed idempotente das 3 prefeituras. Fallback in-code se não houver `DATABASE_URL`. White-label dinâmico funciona (`?tenant=pousoalegre` muda cores/nome do tutor).
- **Seed da rede (Alfenas 7º A)**: usuários demo (incluindo João antes da FK de aluno), 3 demo non-students (Ricardo prof, Cláudia sec, Bruno admin) + memberships idempotentes com update explícito de escopo; `loadTeacherContext()` também repara/faz fallback do vínculo demo do Ricardo se o Neon estiver com row antiga. Há 12 alunos no 7º A (João linkado ao user), 9 habilidades BNCC e proficiência por aluno×habilidade.
- **Dashboard P1 do Professor real**: KPIs (engajados na semana, em risco por proficiência <0.45, total na turma), destaques (top 3 por avg proficiency) e alertas pedagógicos vêm do DB/dados reais da turma. Próximas aulas ainda dependem de integração de agenda.
- **P5 Dashboard da Turma real**: heatmap students × habilidades BNCC + lista ordenada por proficiência + KPIs reais; para a turma demo `class-demo-7a`, há fallback de 12 alunos/9 habilidades se o Neon retornar vazio ou parcial. O foco pedagógico salva por `/api/class-focus`; ao marcar foco ou gerar token de upload, a API garante tenant/escola/turma/habilidades demo antes de gravar; `setBy`/`uploadedBy` são omitidos se o usuário demo não existir no DB, evitando FK quebrada. A lista de alunos abre o perfil real em `/professor/alunos?id=<studentId>`.
- **P6 Perfil do Aluno real**: `/professor/alunos` carrega aluno por `studentId` e escopo de turma do professor; mostra proficiência média, habilidades BNCC do aluno, menores scores, conversas recentes e seletor de alunos da turma. PII familiar/contato ainda não é inventada sem fluxo de consentimento.
- **P7 Diário pedagógico derivado**: `/professor/diario` monta rascunho diário a partir de roster, foco BNCC e materiais prontos da turma. A tabela `pedagogical_diary_entries` já existe na migration 0003, mas a UI ainda não salva/edita/assina entradas.
- **S1 Dashboard da Secretaria real**: KPIs da rede inteira (total alunos, engajados 7d, profs/turmas/escolas, em risco, proficiência média) vêm do DB. IDEB e indicadores Nexus em baixo ainda mockados (gov data que não temos).
- **P2 Copiloto LLM**: `/professor/copiloto` gera plano de aula via Claude Haiku 4.5/OpenRouter, fallback mock. Form (disciplina/série/tema/duração) → linhas `data: ...` → Markdown render com cursor blinking. Resultado grava artefato best-effort em `teacher_artifacts` quando a migration 0003 existir, com fallback em `audit_log`.
- **P3 Correção de redação**: `/professor/correcao` analisa texto colado nas 5 competências ENEM (GPT-4o-mini via OpenRouter, fallback Haiku). Form com nome do aluno + tema + textarea + botão. Resultado grava artefato best-effort em `teacher_artifacts` quando a migration 0003 existir, com fallback em `audit_log`.
- **P4 Gerador de prova real**: `/professor/provas` chama `/api/exam-generation` via capability `exam_generation`, gerando prova com matriz BNCC, versões e gabarito comentado. Permite copiar ou baixar `.md`; grava artefato best-effort em `teacher_artifacts` quando a migration 0003 existir, com fallback em `audit_log`.
- **Tutora v4.3 socrática + RAG da turma**: prompt do `chat_student` reescrito com regras explícitas de não entregar resposta antes do aluno tentar. Slots `{{foco_pedagogico}}` (de `class_focus_skills`) e `{{contexto_material}}` (top-3 chunks via pgvector) injetados pelo `/api/chat`. Quando há material relevante, o chat do aluno mostra chips de fonte abaixo da resposta e persiste essa metadata na mensagem. Sem material relevante → tutora segue com base ampla.
- **Chat multimodal do aluno**: `/api/chat` aceita anexos reais (`image`, `audio`, `document`) vindos do upload. Imagens são carregadas do storage S3 privado e enviadas ao gateway como parte multimodal; áudios são transcritos via OpenAI quando `OPENAI_API_KEY` está presente; PDFs/DOCX/TXT/MD têm texto extraído antes da chamada LLM. A mensagem do aluno persiste metadata do anexo em `messages.attachments`, e a ação é auditada em `audit_log` como `student.chat.attachment_analyze`.
- **Artefatos de estudo do aluno**: `/aluno/estudo` gera cartões de estudo, quiz interativo e resumo guiado via capability `student_artifact_generation`. A rota `/api/student-artifacts` usa `complete()` pelo gateway, aceita tema ou conversa como fonte e salva o resultado best-effort em `student_artifacts` quando a migration 0003 existir, com fallback em `audit_log` (`student_artifact.create`).
- **Material da turma no `/professor/turma`**: card com multi-select de habilidades BNCC pra foco + upload (PDF/DOCX/TXT/MD até 50MB) com status (pendente/processando/pronto/falhou), remoção e reprocessamento manual quando falha. Upload passa por `/api/material/upload`, grava no Railway Bucket/S3 privado e `/api/material/process` extrai texto + chunks + embeddings (`text-embedding-3-small`).
- **Config macro LLM no admin**: `/admin/configuracoes/llm` (papel `admin_nexus`) edita provider/modelo/temperature/maxTokens/fallback por capability e prompts versionados. Mudanças aplicam imediatamente (gateway lê DB com cache por request). Cai no fallback hardcoded sem DB ou sem registro.

## O que está mockado / não funcional ainda

- Contagens (`students`, `teachers`, `schools`) do Tenant ainda vêm do in-code overlay — DB não tem agregados
- RLS escrita no SQL mas conexão atual bypassa (queries rodam como owner; políticas existem mas não enforçam)
- Persistência do diário pedagógico ainda não está ligada na UI: a tabela `pedagogical_diary_entries` foi preparada na migration 0003, mas P7 segue como rascunho derivado.
- Biblioteca da rede ainda é majoritariamente mock, mas já sabe mostrar "Gerados por mim" a partir de `teacher_artifacts` quando a migration 0003 existir, com fallback em artefatos LLM do `audit_log`.
- Planos/provas/correções já têm tabela dedicada (`teacher_artifacts`) preparada, mas ainda faltam edição, compartilhamento, versionamento e busca avançada.
- Telas Secretaria S2-S9 e Admin N2-N7/N9: mockadas (N8 e N8b agora reais)
- IDEB gráfico e Indicadores Nexus na S1 seguem com dados do mock
- Captura de áudio ao vivo no navegador, TTS de resposta, OCR dedicado para PDF/imagem escaneada e o canal WhatsApp multimodal ainda não foram fechados; hoje o fluxo web já aceita envio de arquivo de áudio e documentos textuais.
- Artefatos de estudo do aluno já têm tabela dedicada (`student_artifacts`) preparada, mas ainda faltam busca avançada, edição, compartilhamento com professor e versionamento.
- `audit_log`: já recebe artefatos LLM do professor e fallback de leitura de mural do aluno; ainda faltam writes para todas as ações sensíveis.
- Override de config LLM por tenant (hoje só macro global)

## Próximos passos sugeridos (em discussão)

Ver `docs/ROADMAP.md` Fase 1 — depois de aplicar a migration 0003 no Neon, o foco natural é ligar o diário à tabela dedicada, versionar/compartilhar artefatos, melhorar acessibilidade multimodal e fechar o canal WhatsApp.

## Decisões em aberto

Ver `docs/ROADMAP.md` seção 5 ("Decisões críticas pendentes").

## Gotchas / pegadinhas

- **Next.js 16 ≠ Next.js 14**. Convenção `middleware` foi renomeada pra `proxy`. Ler `node_modules/next/dist/docs/` antes de mexer em rotas, middleware, ou config.
- **Sempre filtrar por `tenantId`**. Nunca escrever query sem isso. RLS é a segunda barreira, não a primeira.
- **LLM nunca direto do componente**. Tudo via `src/lib/llm/gateway.ts`.
