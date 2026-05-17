# Histórico

> **Adicionar uma entrada nova no TOPO depois de qualquer mudança de código.** Foco no *porquê* e em consequências, não em detalhes triviais que o `git log` já tem.
>
> Formato: `## YYYY-MM-DD — título curto` + bullets.

---

## 2026-05-17 - Etapa 1 do UX do chat do aluno

- `src/components/phone/chat-client.tsx` ganhou um redesign focado em engajamento: header compacto da tutora, ações rápidas, composer multilinha e feedback claro para upload/resposta da IA.
- As bolhas da tutora ficaram mais estruturadas visualmente, com superfície própria, indicador de pensamento e bloco de fontes da turma mais legível quando o RAG retorna materiais.
- O envio de mensagem passou a usar textarea responsivo com `Shift+Enter` para quebra de linha e botões de ferramenta com rótulos acessíveis.
- `src/app/aluno/layout.tsx` agora usa uma grade responsiva: sidebar completa no desktop e navegação inferior no mobile, evitando que o chat fique espremido em telas pequenas.
- `src/components/shell/aluno-sidebar.tsx` foi reorganizada para deixar navegação e configuração antes de "Recentes", atendendo à validação de UX da etapa.
- O seletor visual de tenant demo fica oculto no mobile para não cobrir o composer do chat e a navegação inferior.
- `AGENTS.md` registra a nova regra operacional pedida pelo Bruno: todo fechamento deve trazer 3 sugestões de melhorias ou tarefas relacionadas.

Consequencia: a primeira etapa melhora a primeira impressão do aluno no chat sem alterar contrato de API, persistência ou LLM; a próxima etapa pode focar nos cartões premium.

---

## 2026-05-17 - Infra de producao Railway, proxy Next 16 e RLS

- `src/middleware.ts` foi migrado para `src/proxy.ts`, com export `proxy`, seguindo a convencao do Next.js 16 e removendo o aviso de build sobre middleware legado.
- O cliente Postgres passou a aplicar `app.tenant_id` automaticamente por request quando `getCurrentTenant()` ou `resolveTenantId()` resolvem o tenant, usando contexto async e resetando a sessao do pool depois de cada query.
- A migration `9999_rls_policies.sql` agora cobre as tabelas tenant-scoped mais recentes e aplica `FORCE ROW LEVEL SECURITY`, reduzindo o risco de a conexao owner bypassar as politicas.
- Seeds e fallbacks demo de aluno/professor deixam de rodar em `NODE_ENV=production`, salvo `NEXUS_DEMO_MODE=true` ou `NEXUS_ALLOW_MOCKS=true`.
- Auth por credenciais reais agora resolve o tenant da request antes de consultar `memberships`, mantendo login compativel com RLS por tenant.
- Railway passou a usar `/api/health` como healthcheck tecnico sem DB, evitando que falhas de render/tenant na home confundam o status do container.
- A leitura da tabela global `tenants` roda fora do contexto RLS, porque ela nao e tenant-scoped; o pool tambem ganhou timeout de conexao/query e o tenant DB lookup cai para o in-code em 2,5s para evitar requests pendurados.

Consequencia: a operacao em Railway fica mais alinhada ao alvo de producao real: Next 16 sem middleware legado, RLS efetivamente acoplada ao tenant da request e mocks/dados demo bloqueados por padrao em producao.

---

## 2026-05-17 - CRUD operacional inicial da Secretaria

- `/secretaria/rede` ganhou cadastro real de escola e importacao CSV de alunos; o importador aceita colunas `nome`, `escola`, `turma`, `serie`, `cpf`, `nascimento` e `bolsa_familia`, criando escola/turma ausentes quando necessario.
- `/secretaria/turmas` ganhou formulario para criar turma vinculada a escola do tenant.
- `/secretaria/alunos` ganhou cadastro manual de aluno, derivando escola pela turma selecionada e evitando duplicidade por CPF ou nome na mesma turma.
- `/secretaria/usuarios` ganhou criacao/atualizacao de usuario com membership por papel, escopo de escola/turma e senha provisoria para login por credenciais enquanto convites por e-mail ainda nao existem.
- As novas Server Actions (`createSchool`, `createClass`, `createStudent`, `createUserMembership`, `importStudentsCsv`) validam `tenantId`, revalidam as telas da Secretaria e registram eventos em `audit_log`.

Consequencia: a Secretaria passa a operar a base minima da rede sem depender de SQL manual; ainda faltam edicao/exclusao controlada, convites por e-mail, validacao visual de erros e importadores para usuarios/turmas completos.

---

## 2026-05-17 - Guardrails de producao, diario e Secretaria real

- Criada a camada `src/lib/runtime/mode.ts` para separar dev/demo de producao: fallbacks mock de LLM, embeddings e storage agora sao bloqueados em runtime de producao, salvo `NEXUS_ALLOW_MOCKS=true` ou `NEXUS_DEMO_MODE=true`.
- Auth passou a tentar usuarios reais do banco antes das contas demo, com `users.password_hash`, hash `scrypt`, auditoria de login e credenciais demo escondidas fora de dev/demo.
- Adicionado `writeAuditLog()` como helper central best-effort e ligado em login, alteracoes de LLM admin, diario pedagogico e comunicados da Secretaria.
- A sidebar do aluno deixou a lista fixa de conversas recentes e agora carrega `conversations` reais, alem de mostrar o contador real de comunicados nao lidos.
- `/professor/diario` agora salva rascunhos em `pedagogical_diary_entries`, lista entradas da turma, permite assinatura e audita as duas acoes.
- As telas principais da Secretaria passaram a ler dados do Postgres por tenant: dashboard, rede, escolas, turmas, alunos, usuarios, mural e preview de relatorio. O mural cria comunicados reais em `student_announcements` e calcula leitura por `student_announcement_reads`.
- Criada a migration `0004_production_foundation.sql` para `users.password_hash` e indices auxiliares de mensagens/auditoria, incluida no fluxo idempotente de deploy.

Consequencia: o app fica mais seguro para operacao Railway/production, reduz mocks silenciosos e transforma Secretaria/diario em fluxos reais sem bloquear os proximos CRUDs completos.

---

## 2026-05-17 — Migração do storage para Railway Bucket/S3

- Criado e aplicado um Railway Bucket S3-compatível no projeto `dynamic-essence`, ligado ao serviço `nexus_education` com variáveis AWS (`AWS_ENDPOINT_URL`, `AWS_S3_BUCKET_NAME`, `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
- O provider de storage deixou de depender de Vercel Blob e passou a usar `@aws-sdk/client-s3`, retornando URLs internas `/api/storage/...` servidas por rota autenticada e validada por tenant.
- Uploads do chat multimodal continuam passando por `/api/upload`; materiais da turma agora usam multipart em `/api/material/upload`, gravam no bucket privado, criam `documents` e disparam o processamento RAG pelo mesmo arquivo S3.
- O processamento multimodal e o RAG passaram a baixar arquivos pelo provider privado, sem aceitar URLs externas arbitrárias.
- Deploy Railway `7b05b70` ficou ativo e `Deployment successful`; smoke test em `nexuseducation-production.up.railway.app` validou home, login professor, `/api/llm-health`, upload/processamento de material TXT e upload/análise de documento no chat do aluno.

Consequência: a operação de arquivos está centralizada na Railway junto do app e do Postgres, com validação real de S3 privado, RAG e chat multimodal.

---

## 2026-05-17 — Preparo para deploy no Railway

- Adicionado `railway.json` com build, start command, healthcheck e pre-deploy command para rodar migrations antes de subir o container.
- O cliente Drizzle deixou de depender do driver específico do Neon e passou a usar `pg`/Node Postgres, permitindo conectar tanto no Railway Postgres quanto no Neon durante a transição.
- Criado `scripts/apply-sql-migrations.mjs` para aplicar os SQLs manuais em fases (`prepush` antes do `drizzle-kit push` e `postpush` depois), cobrindo extensão `vector`, pgcrypto, RLS e tabelas adicionadas manualmente.
- `9999_rls_policies.sql` ficou idempotente para poder ser reexecutado em deploy sem falhar por política já existente.
- `package.json` ganhou scripts `start:railway`, `db:push:force`, `db:prepare`, `db:postdeploy` e `db:deploy`.

Consequência: o app está pronto para um deploy paralelo no Railway; falta apenas criar/ligar um serviço PostgreSQL com pgvector e preencher as variáveis de ambiente no painel antes de promover Railway como produção principal.

---

## 2026-05-17 — Base Neon para artefatos e diário

- Criada a migration `0003_artifacts_diary_and_rls.sql` com tabelas dedicadas para `student_artifacts`, `teacher_artifacts` e `pedagogical_diary_entries`, além de reforço de RLS para tabelas adicionadas depois da política inicial.
- O schema Drizzle agora conhece essas três tabelas e suas relações principais com tenant, aluno, usuário, conversa e turma.
- `src/lib/student/artifacts.ts` e `src/lib/teacher/artifacts.ts` passaram a tentar ler/gravar nas tabelas dedicadas primeiro e só cair para `audit_log` quando a migration ainda não existir ou quando o banco recusar a persistência.
- A migration foi escrita para não quebrar ambientes onde a `0002_student_announcements.sql` ainda não tiver sido aplicada, ignorando tabelas ausentes ao configurar RLS.

Consequência: a aplicação já está preparada para persistência mais limpa no Neon sem quebrar a produção antes da aplicação manual do SQL; depois de aplicar a migration 0003, artefatos deixam de depender do `audit_log` como armazenamento principal.

---

## 2026-05-17 — Renderização Markdown das respostas da IA

- Criado `LlmMarkdown` como renderizador compartilhado para respostas geradas por LLM, com `react-markdown`, GFM, quebra de linha amigável e HTML bruto desabilitado.
- O chat do aluno deixou de exibir Markdown como texto cru e agora interpreta negrito, listas, tabelas, links e blocos de código nas respostas da tutora.
- As telas do professor que geram conteúdo por IA (`/professor/copiloto`, `/professor/correcao`, `/professor/provas` e previews da biblioteca) passaram a usar o mesmo renderizador.
- Os artefatos de estudo do aluno também passaram a renderizar Markdown nos cartões, quiz e resumo guiado quando o modelo devolver ênfases ou listas dentro dos campos estruturados.

Consequência: o formato produzido pela LLM agora é capturado pela interface em vez de aparecer quebrado com `**negrito**`, listas e tabelas como texto literal.

---

## 2026-05-17 — Revitalização visual global

- A paleta base deixou de depender tanto de cinzas neutros e passou a usar superfícies claras, washes da marca do tenant e acentos pedagógicos para dar mais energia sem infantilizar a interface.
- `globals.css` ganhou tokens e helpers compartilhados (`app-shell`, `app-main`, `surface-card`, `surface-card-strong`, `soft-band`, `lift-on-hover`, `section-label`) para padronizar o novo visual entre Aluno, Professor, Secretaria e Admin.
- Shells, topbar, sidebar, cabeçalhos, botões, cards, badges e chips foram ajustados para usar superfícies mais luminosas, bordas menos pesadas, sombras sutis e estados de hover mais vivos.
- As telas mais críticas do aluno (`/aluno/chat` e `/aluno/estudo`) receberam uma passada específica em input, mensagens, anexos, artefatos, quiz e resumo guiado para parecerem mais motivadoras.

Consequência: a aplicação fica menos cinza e mais alinhada com uma experiência SaaS educacional white-label, mantendo o tom institucional necessário para redes públicas.

---

## 2026-05-17 — Validação de produção do chat multimodal e estudo ativo

- Deploy `8fefb7c` no projeto Vercel `claude-code-teste` passou depois da correção de typecheck no parser multimodal.
- Validação local executada com `next build`, `tsc --noEmit`, `eslint src` e `git diff --check`.
- Em produção, `/aluno/estudo` abriu autenticada e carregou os artefatos recentes persistidos.
- `/api/student-artifacts` gerou, via OpenRouter real, os três tipos de estudo ativo: cartões, quiz e resumo guiado.
- `/api/upload` aceitou imagem PNG, documento TXT e áudio WAV no Blob privado; `/api/chat` analisou os três anexos juntos e respondeu com base no conteúdo visual, texto extraído e transcrição.

Consequência: o bloco pedido para o aluno ficou validado em produção de ponta a ponta para estudo ativo e chat multimodal web.

---

## 2026-05-16 — Chat multimodal e artefatos de estudo do aluno

- `/api/chat` agora aceita anexos estruturados (`image`, `audio`, `document`) e prepara o conteúdo no servidor antes de chamar o gateway LLM: imagem vai como parte multimodal, áudio é transcrito pela API de transcrição da OpenAI quando há chave, e documentos usam extração de texto (`pdf-parse`/`mammoth`/texto).
- O chat do aluno passou a enviar e reabrir anexos reais, com preview de imagem, áudio e documento, além de persistir metadata em `messages.attachments`.
- Criada a capability `student_artifact_generation`, com prompt JSON próprio e rota `/api/student-artifacts` para gerar cartões, quiz e resumo guiado a partir de um tema ou conversa do aluno.
- Nova página `/aluno/estudo` entrega a experiência interativa de cartões viráveis, quiz com feedback e resumo guiado; os artefatos são persistidos best-effort em `audit_log` com `action='student_artifact.create'`.
- Ações sensíveis de análise de anexo registram `student.chat.attachment_analyze` em `audit_log` sem exigir migration nova.
- Normalização de mensagens/anexos ajustada para passar no typecheck do Next 16/TypeScript estrito, mantendo o mesmo contrato aceito por `/api/chat`.

Consequência: a próxima validação de produção deixa de ser só chat textual; o aluno já consegue enviar mídia/documentos para a tutora analisar e transformar o material em estudo ativo.

---

## 2026-05-16 — A1/A4/A5/A6 do aluno com dados reais

- `/aluno/onboarding` deixou os dados fixos e passou a carregar aluno/escola/turma da sessão, salvar apelido em `students.nickname` e registrar consentimento em `consent_log`.
- `/aluno/trilha` passou a calcular progresso por `student_proficiency` + `habilities`, com próximo passo derivado do menor score BNCC do aluno.
- `/aluno/acessibilidade` agora persiste o modo escolhido em `students.a11y_mode` e registra a mudança em `audit_log`.
- `/aluno/mural` ganhou schema/migration para `student_announcements` e `student_announcement_reads`, com leitura/confirmação por aluno e fallback auditável em `audit_log` enquanto a migration 0002 não estiver aplicada no Neon.
- Criada a camada `src/lib/student/{queries,actions}.ts` para impedir Drizzle direto nas páginas do aluno.

Consequência: a área do aluno fica bem mais perto de um fluxo testável em produção, e os próximos blocos podem focar no chat multimodal e nos artefatos de estudo sem carregar mocks estruturais dessas quatro telas.

---

## 2026-05-16 — Ajuste de build dos alertas P1

- Corrigida a tipagem de prioridade em `loadTeacherAlerts()` para evitar falha de TypeScript no build da Vercel.

Consequência: mantém a entrega de alertas reais e libera novo deploy de produção.

---

## 2026-05-16 — P1 alertas pedagógicos reais

- `/professor` deixou de renderizar `ALERTAS_PROF` e passou a carregar `loadTeacherAlerts()` junto dos KPIs e destaques.
- Os alertas são derivados do roster real da turma: risco por proficiência baixa, pendência por ausência/inatividade de conversa e conquista por proficiência avançada.
- Cada alerta leva direto ao perfil real do aluno em `/professor/alunos?id=...`.
- O KPI de próximas aulas não mostra mais um número falso; enquanto não houver agenda integrada, a tela assume "agenda pendente".

Consequência: o dashboard inicial do professor fica mais honesto e mais útil na demo, com alertas conectados aos mesmos dados pedagógicos já usados em turma, perfil e diário.

---

## 2026-05-16 — P7 diário pedagógico derivado da turma

- `/professor/diario` deixou os cards fixos e passou a montar um rascunho diário a partir de dados reais da turma: roster, foco BNCC e materiais prontos.
- A tela mostra KPIs da turma, alunos abaixo do corte de atenção, habilidades foco e materiais conectados ao RAG.
- O botão "Nova entrada" fica desabilitado e a própria tela informa que ainda falta tabela dedicada para salvar/editar/assinar entradas.

Consequência: P7 já ajuda na demo com dado real sem fingir persistência que ainda não existe.

---

## 2026-05-16 — P6 perfil do aluno real

- `/professor/alunos` deixou de usar `ALUNOS_7A[0]` fixo e passou a carregar o aluno pelo DB via `loadStudentProfile()`, respeitando as turmas vinculadas ao professor.
- O perfil agora mostra dados pedagógicos reais: proficiência média, habilidades BNCC do aluno, menores scores, conversas recentes, último acesso e seletor de alunos da turma.
- A lista de alunos em `/professor/turma` agora abre `/professor/alunos?id=<studentId>`, preservando o aluno escolhido.
- Dados sensíveis sem fluxo consentido (CPF, telefone e responsável) não são inventados na UI; a tela exibe aviso LGPD e mantém o escopo pedagógico.

Consequência: P6 vira parte navegável do fluxo real do professor e deixa de ser uma vitrine mockada de um único aluno.

---

## 2026-05-16 — Busca real no histórico do aluno

- `/aluno/historico` passou a ler `?q=` e `?area=` do App Router e filtrar conversas do DB por título/área.
- A busca virou formulário GET, e os chips de disciplina agora são links com URL compartilhável.
- Empty state diferencia "sem conversas ainda" de "nenhuma conversa encontrada" e oferece limpar filtros.

Consequência: A3 deixa de ter controles decorativos; o aluno consegue achar conversas antigas sem depender só do agrupamento por data.

---

## 2026-05-16 — Reprocessamento manual de material

- O painel `/professor/turma` ganhou ação "Reprocessar" para materiais com status `failed`, reaproveitando `/api/material/process`.
- A rota de processamento agora valida o tenant do documento quando chamada pelo navegador autenticado, evitando reprocessamento cruzado entre redes por `documentId`.
- A UI mostra estado de carregamento por material e reapresenta o erro controlado se a nova tentativa falhar.

Consequência: a professora não precisa remover e subir o mesmo arquivo de novo quando extração/embedding falhar; também fechamos uma barreira multi-tenant no endpoint.

---

## 2026-05-16 — Fontes RAG visíveis no chat do aluno

- `/api/chat` passou a montar o contexto de material como `block + sources`: o mesmo trecho usado no prompt agora também vira metadata para a interface.
- O stream do chat ganhou o chunk `sources`, enviado quando a busca vetorial encontra material da turma acima do threshold.
- Mensagens da tutora persistem as fontes usadas em `messages.attachments` com `kind="source"` (nome do documento, índice do trecho e score), sem exigir migration nova.
- `/aluno/chat` renderiza chips compactos "Fonte" abaixo da resposta da tutora e também reidrata essas fontes ao abrir uma conversa antiga.

Consequência: quando o professor subir material e a tutora usar um trecho RAG, o aluno enxerga de onde veio a resposta, fechando a transparência mínima do MVP.

---

## 2026-05-16 — P4 gerador de prova real + artefatos do professor

- Adicionada capability `exam_generation` no gateway LLM, com rota hardcoded, prompt versionado `src/lib/llm/prompts/exam-generation.ts` e visibilidade no admin de configuração macro LLM.
- Criado endpoint `/api/exam-generation`, restrito a professor/coordenador/diretor/orientador, que gera prova com matriz BNCC, versões e gabarito comentado via `complete()` + linhas `data: ...`.
- `/professor/provas` deixou de ser mock estático e virou ferramenta real com formulário de disciplina, série, temas, quantidade de questões, versões, duração e dificuldade. Resultado pode ser copiado ou baixado como `.md`.
- Planos de aula, correções de redação e provas gravam artefato best-effort em `audit_log` (`teacher_artifact.create`) com parâmetros, conteúdo limitado, modelo e tokens.
- A persistência fica desacoplada da FK de usuário no `audit_log` e limita o conteúdo gravado, para preservar a geração mesmo quando a trilha best-effort falhar.
- `/professor/biblioteca` ganhou seção "Gerados por mim", lendo os artefatos do professor no `audit_log` antes dos cards mockados da biblioteca da rede.
- O gateway agora propaga `promptVersion` nas chamadas `complete()`, permitindo rastrear qual prompt gerou cada artefato.
- `/api/llm-health` passou a aceitar `?capability=` e `?format=sse` para smoke test controlado das capabilities de professor em produção.
- `createBufferedSseResponse()` agora usa `NextResponse`, mantendo o contrato de linhas `data: ...` alinhado ao App Router em produção.
- Endpoints de professor definem `maxTokens` explicitamente para evitar geração longa demais na função de produção.

Consequência: o professor já consegue gerar prova real em produção e os principais artefatos LLM deixam rastro reaproveitável sem exigir uma nova migration antes da demo. Uma tabela dedicada de artefatos ainda é recomendada quando a biblioteca evoluir para edição, compartilhamento e versionamento completo.

---

## 2026-05-16 — Vercel Blob privado para materiais

- Confirmado Blob Store `nexus-materials` conectado ao projeto `claude-code-teste` com `BLOB_READ_WRITE_TOKEN`.
- Ajustado provider de storage e upload de materiais para `access: "private"`, compatível com o store privado.
- `/api/material/process` passou a baixar material privado com `get()` do `@vercel/blob`, em vez de `fetch()` direto na URL privada.
- `/api/material/upload` resolve `tenantId` no servidor, via sessão/contexto, em vez de confiar em payload do cliente.
- Seed da rede agora atualiza memberships demo existentes por `userId + tenantId + role`, sem depender do índice composto, para garantir que Ricardo fique vinculado ao `7º A` mesmo quando a row antiga já existia sem `classId`.
- `loadTeacherContext()` ganhou reparo/fallback específico para o professor demo Ricardo em Alfenas, evitando que a página `/professor/turma` fique bloqueada se o Neon estiver com membership antigo sem escopo.
- Seed da rede também garante o user demo `u-joao` antes de inserir `students`, evitando falha de FK que deixava a turma sem alunos/habilidades em produção.
- Queries da turma usam fallback demo de 12 alunos e 9 habilidades BNCC quando o DB retorna vazio para `class-demo-7a`, mantendo a validação de produção navegável enquanto o seed real é estabilizado.
- `setClassFocus()` garante as habilidades BNCC conhecidas antes de inserir foco, para o clique funcionar mesmo quando a lista veio do fallback demo.
- O painel de foco agora mostra erro controlado quando a persistência falha, em vez de derrubar a página com erro de Server Action.
- Action de foco e token de upload garantem a escola/turma demo `class-demo-7a` antes de validar `classes`, cobrindo o caso em que a tela veio do fallback visual.
- As mesmas garantias também criam o tenant demo `alfenas` antes das FKs de escola/turma quando a base ainda não tem a row.
- A lista de habilidades disponíveis agora mescla DB + fallback demo, evitando que uma base parcialmente seedada mostre só a habilidade recém-inserida.
- `setClassFocus()` e `/api/material/upload` agora só gravam `setBy`/`uploadedBy` quando o usuário demo existe de fato no DB; se houver conflito legado de e-mail/id, a ação continua salvando sem violar FK.
- Criado `/api/class-focus` para salvar foco BNCC por JSON autenticado, e o painel passou a usar esse endpoint em vez de depender de Server Action opaca no cliente.

Consequência: uploads passam a respeitar o store privado da Vercel e ficam mais alinhados com LGPD/material escolar sensível.

---

## 2026-05-16 — Logout visível nas áreas autenticadas

- Adicionado `LogoutButton` compartilhado em `src/components/shell/logout-button.tsx`, usando `signOut()` do NextAuth e redirecionando para `/entrar`.
- O botão "Sair" aparece no rodapé do shell de aluno, professor, secretaria e admin, sem precisar repetir código em cada página interna.
- `Sidebar` e `Topbar` agora podem receber o nome real da sessão; os layouts de professor, secretaria e admin passam o usuário retornado por `requireRole(...)`.
- `session-paths.ts` ganhou labels client-safe de papéis para exibir "Professor", "Secretaria", "Admin Nexus" etc. sem acoplar componentes ao server auth.

Consequência: usuários demo e futuros usuários reais conseguem encerrar a sessão por qualquer área protegida, reduzindo confusão nos testes de produção e evitando troca de perfil presa no navegador.

---

## 2026-05-16 — Produção validada para fluxos LLM principais

Validação final na produção (`claude-code-teste.vercel.app`) depois do deploy da correção de SSE:

- `/api/chat` autenticado como aluno respondeu `200 OK` com linhas `data: ...` e modelo `anthropic/claude-haiku-4-5`.
- `/api/lesson-plan` autenticado como professor respondeu `200 OK` e gerou um plano completo de frações equivalentes.
- `/api/essay-correction` autenticado como professor respondeu `200 OK` e gerou devolutiva ENEM via `openai/gpt-4o-mini`.
- O falso `500` restante era artefato do payload montado pelo PowerShell; enviando JSON por arquivo com `--data-binary @...` a rota respondeu corretamente.
- Removidos os desvios diagnósticos temporários (`topic: "__ping"`, `topic: "__json"`) e a rota `/api/sse-health` antes de deixar a produção para teste do Bruno.

Consequência: Bruno já pode testar a aplicação em produção nos fluxos principais de login, chat do aluno, copiloto do professor e correção de redação. Upload de material ainda depende do Vercel Blob (`BLOB_READ_WRITE_TOKEN`).

---

## 2026-05-16 — Corrige SSE em produção para chat/copiloto/correção

Teste real na produção (`claude-code-teste.vercel.app`) antes de Bruno validar o app:

- Home e `/entrar` responderam `200 OK` na Vercel (`gru1`).
- Login demo professor (`ricardo@alfenas.demo`) e aluno (`joao@alfenas.demo`) funcionaram; páginas `/professor`, `/aluno/chat` e `/aluno/historico` abriram autenticadas.
- `/api/llm-health` autenticado respondeu com provider real (`openrouter`), modelo `anthropic/claude-haiku-4-5`, `sample: "pong"` e chaves `OPENROUTER_API_KEY`/`OPENAI_API_KEY` presentes.
- As rotas SSE (`/api/chat`, `/api/lesson-plan`, `/api/essay-correction`) retornavam `500` quando entravam no caminho de streaming.

**Correção aplicada:** removido o header hop-by-hop `Connection: keep-alive` das respostas e extraído `createBufferedSseResponse()` em `src/lib/http/sse.ts`. As rotas usam `complete()` do gateway e devolvem linhas `data: ...` bufferizadas (`text` + `done`) em vez de token streaming. A resposta sai como `text/plain` porque os clients leem o corpo por `fetch().body.getReader()` e não dependem de `text/event-stream`. É um fallback pragmático para produção: o front mantém o contrato de linhas SSE, e o caminho `complete()` já foi validado pelo `/api/llm-health`.

**Impacto confirmado:** destrava chat do aluno, copiloto de plano de aula e correção de redação em produção sem alterar contratos de payload nem o formato SSE consumido pelos clients. O streaming token-by-token fica como melhoria técnica posterior.

**Diagnóstico encerrado:** os endpoints temporários usados para separar falha de transporte HTTP, parsing de JSON e gateway LLM foram removidos depois da validação.

---

## 2026-05-16 — Hooks de continuidade entre sessões (.claude/hooks/)

Bruno levantou o problema real: cada nova conversa do Claude começa do zero, e mesmo com `CLAUDE.md` mandando ler os docs vivos, o Claude às vezes pula (eu mesmo pulei na sessão anterior, levou Bruno a perguntar "você está salvando isso?"). Solução: hooks programáticos no `.claude/settings.json` do projeto — executados pelo harness do Claude Code, não por mim, então não dependem de eu lembrar.

**Hook `SessionStart` (`.claude/hooks/inject-docs.sh`)**
- Dispara automaticamente quando uma sessão começa nesse repo.
- Lê `docs/contexto.md`, `docs/arquitetura.md`, `docs/historico.md` e injeta tudo via `hookSpecificOutput.additionalContext` — o conteúdo aparece no contexto do modelo como mensagem de sistema, antes da primeira fala do usuário.
- Não tem como o Claude "esquecer" de ler. Está garantido.

**Hook `Stop` (`.claude/hooks/check-historico.sh`)**
- Dispara quando o agente tenta encerrar o turno.
- Checa `git diff HEAD` + `git diff --cached`. Se há mudança em `src/`, `drizzle/migrations/`, `package.json` ou `package-lock.json` mas `docs/historico.md` está intocado → retorna `{"decision":"block","reason":"..."}` e o modelo é obrigado a continuar trabalhando (com o reason como feedback).
- Estado limpo (sem código modificado) → sai vazio, deixa parar normal.
- Código modificado + historico também modificado → deixa parar normal.

**Por quê assim:** o usuário é fundador não-técnico que troca de sessão com frequência. Cada sessão perdida é trabalho que se repete. Esses dois hooks fecham as duas pontas: leitura forçada na entrada, escrita forçada na saída. O `CLAUDE.md` continua sendo a documentação humana do workflow; os hooks são a barreira de cinto.

**Convenções**: scripts em `.claude/hooks/` são `chmod +x`, usam `set -euo pipefail`, fazem `cd` pro root do repo via `$(dirname "$0")/../..` (paths relativos a partir daí). Settings em `.claude/settings.json` (commitado); overrides pessoais em `.claude/settings.local.json` (gitignored — já estava).

**Caveat operacional**: hooks novos só passam a valer em sessões **novas** (depois desse commit estar na main). A sessão atual em que criei os hooks não está sujeita a eles. Próxima conversa do Bruno vai ver os docs injetados automaticamente no início.

---

## 2026-05-15 — Subida da v4.3 / RAG / admin LLM em produção (infra)

Sessão operacional, sem código novo — só infra pra colocar a entrega anterior no ar.

- **PR #1** (`brunlife-droid/claude-code-teste`) aberta a partir de `claude/finish-testing-deps-l0yIk` e mergeada (squash) em `25dffd4` na `main`. Vercel auto-deployou.
- **Migration `0001`** aplicada manualmente no Neon via SQL Editor do navegador (Bruno só usa GitHub, sem psql local). Idempotente — alguns `IF NOT EXISTS` apontaram que extensões `vector`/`pgcrypto` e índice `chunks_embedding_hnsw_idx` já existiam de migration anterior, o que é OK. Validado via `SELECT` final que as 3 tabelas novas (`class_focus_skills`, `llm_routes`, `system_prompts`) e a coluna `documents.class_id` existem.
- **Env var `OPENAI_API_KEY`** adicionada na Vercel (Production/Preview/Development). Redeploy disparado pra app enxergar a nova chave. Justificativa de ter chave OpenAI separada: OpenRouter não proxia embeddings — `text-embedding-3-small` precisa ir direto.
- **Pendente**: provisionar Vercel Blob (Storage → Create → Blob → conectar ao projeto). Isso auto-injeta `BLOB_READ_WRITE_TOKEN` e desbloqueia upload de material da profe.

**Por quê desse registro**: Bruno é fundador não-técnico — sessões futuras precisam saber qual estado de infra já existe em produção pra não pedir pra ele repetir passo que já foi feito (criar conta na OpenAI, aplicar migration etc.). Detalhes finos do que está/não está configurado ficam em `docs/contexto.md` seção "Estado de produção".

---

## 2026-05-15 — Tutora socrática v4.3 + RAG da turma + config macro LLM no admin

Sessão grande: três frentes pedidas pelo Bruno em paralelo.

**1. Tutora v4.3 — socrática reforçada + escopo generalista + slots de turma**
- `src/lib/llm/prompts/student-tutor.ts` reescrito (v4.3). Seção "Método socrático é inegociável" com regras explícitas — nunca entregar resposta antes do aluno tentar pelo menos 2 vezes, sempre devolver pergunta investigativa, dar pistas mínimas.
- Escopo deixa claro que ela é generalista forte (todas áreas BNCC 9-15 anos) — responde sobre QUALQUER tema mesmo sem material do professor.
- Novos slots: `{{foco_pedagogico}}` (habilidades BNCC marcadas como foco da turma) e `{{contexto_material}}` (trechos RAG do material).
- Slot vazio agora vem com placeholder textual neutro pra LLM não estranhar (Claude às vezes "comenta" string vazia).

**2. Material do professor + RAG end-to-end**
- Schema novo: `class_focus_skills` (turma × habilidade priorizada), colunas em `documents` (`classId`, `uploadedBy`, `kind`, `status`, `sizeBytes`, `error`).
- Migration `0001_class_materials_focus_and_llm_config.sql` idempotente; cria também índice HNSW em `chunks.embedding`.
- Upload **direto do browser pro Vercel Blob** via `@vercel/blob/client` + handler `/api/material/upload` com `handleUpload` — bypassa limite de 4.5MB do body de função. Teto de 50MB no token assinado.
- Processamento em `/api/material/process`: baixa do Blob, extrai texto (`pdf-parse` p/ PDF, `mammoth` p/ DOCX, texto puro p/ TXT/MD), chunka (1800 chars + overlap 200), embedda em batch (`text-embedding-3-small` via OpenAI direto), persiste em `chunks`. `maxDuration = 300` pra caber arquivo grande.
- Retrieve em `src/lib/llm/rag/retrieve.ts` — busca top-3 chunks por similaridade cosseno em pgvector, threshold 0.35.
- `/api/chat` agora resolve `classId` do aluno e injeta foco + material no `systemContext` antes de chamar o gateway. Sem material relevante → slot diz "responda com seu conhecimento amplo".
- Painel novo em `/professor/turma`: lista de habilidades BNCC com checkbox pra marcar foco + área de upload com lista de materiais (status pendente/processando/pronto/falhou) e botão de remover.

**3. Tela admin de config macro LLM**
- Novas tabelas: `llm_routes` (rota ativa por capability com provider/model/temperature/maxTokens/fallback) e `system_prompts` (prompts versionados, `active` único por capability via unique index parcial).
- `src/lib/llm/config.ts` é o loader runtime: lê DB primeiro, cai pro hardcoded de `routes.ts`/`prompts/*` se DB indisponível ou query falhar. Cacheado por request via React `cache()`.
- Gateway refatorado pra consumir o loader em vez do hardcoded direto. Mantém os fallbacks atuais como rede de segurança.
- Página `/admin/configuracoes/llm` (linkada do sidebar como N8b): grid 2 colunas. Esquerda lista todas as 6 capabilities com selects de provider/modelo e inputs de temperature/maxTokens/fallback — salva via Server Action `upsertRoute`. Direita mostra prompts da capability selecionada com histórico de versões, edição inline (sempre cria nova versão, nunca sobrescreve), botões "Ativar" e "Apagar" (não permite apagar a ativa).
- Versão "hardcoded" sempre aparece no histórico como fallback ativável (re-ativa simplesmente desativando o ativo do DB).

**Por quê**: Bruno pediu que (1) a tutora não fique presa ao material — ela responde tudo, com socratismo de verdade; (2) o material da professora vire fonte primária quando houver; (3) ele consiga trocar modelo/temperatura/prompt sem deploy. Esses três viraram um vertical slice funcional end-to-end. Macro global por enquanto (sem override por tenant) — escolha consciente pra reduzir complexidade inicial.

**Decisão técnica do upload 50MB**: usar client uploads do `@vercel/blob/client` ao invés de aumentar limite de função. Função só gera token assinado curto, browser PUT direto no Blob. Sem cap real (Vercel Blob aceita até 5GB); 50MB é teto de produto, não técnico.

**Pendências conhecidas / Fase 2:**
- Audit log dos edits do admin (TODO marcado em `llm-actions.ts`).
- Mostrar "fonte" usada pela tutora abaixo da resposta no chat (transparência pro aluno).
- Override por tenant das rotas (quando aparecer demanda real de uma prefeitura específica).
- Reprocessamento manual de material falhado (botão "tentar de novo" no painel).
- OCR pra PDF que é só imagem escaneada.

**Build/lint**: limpos. 47 rotas geradas.

---

## 2026-05-15 — P3 Correção de redação com GPT-4o-mini

- **Novo prompt** `src/lib/llm/prompts/essay-correction.ts` v1.0 — avalia redação nas 5 competências ENEM (C1-C5), feedback no tom "colega corretor sugerindo devolutiva ao professor", não nota final. Inclui "Sugestão de devolutiva ao aluno" como parágrafo de fechamento.
- **Gateway extendido**: `injectSystemPrompt` agora cobre 3 capabilities (`chat_student`, `plan_generation`, `essay_correction`). A `essay_correction` resolve pra `gpt-4o-mini` via OpenRouter (fallback claude-haiku-4-5 já configurado em `routes.ts`).
- **Novo route handler** `/api/essay-correction` (POST, SSE stream) — exige sessão professor/coordenador/diretor/orientador. Body: `{ studentName, topic, essay }`. Limite de 8000 caracteres no texto.
- **`/professor/correcao` refatorado**: Server Component delega pra `CorrecaoClient`. Form com nome do aluno, tema, textarea grande (min 420px) pra colar a redação e botão de corrigir. Streaming Markdown na direita com cursor blinking. Texto de exemplo já vem preenchido pra demo.
- **Demo coerente**: a UI tem amostra de redação sobre desigualdade social (com "as pessoas" repetido 3x propositalmente pra IA marcar problema de coesão).
- Sem persistência ainda (correções não salvam em DB).
- Build/lint limpos.

**Por quê**: P2 (copiloto) usa Claude. P3 (correção) usa GPT-4o-mini — exercita o roteamento real do gateway por capability e mostra que a abstração funciona. Também é o feature LLM mais "vendável" pra professor: corrigir redação leva ~15min por aluno × 28 alunos = 7h por bimestre. Com IA, vira 3min de revisão por aluno.

**Ainda pendente em /professor**: P4 (gerar prova), P6 (perfil aluno), P7 (diário), P8 (biblioteca), persistência de planos+correções, alertas reais.

---

## 2026-05-15 — P5 Turma real + S1 Secretaria real + P2 Copiloto LLM

Três features em uma sessão (escopo: telas de leitura + primeira feature LLM do professor).

**P5 — `/professor/turma` real:**
- `loadClassHeatmap()` em `teacher/queries.ts` — matriz students × habilities com scores reais de `student_proficiency`.
- `loadClassRoster()` — lista com avg proficiency, nº de conversas e última atividade (max(updatedAt) por aluno).
- Página refatorada pra Server Component: KPIs (alunos, engajados, em risco, proficiência média), heatmap real e roster ordenado por avg score. Empty states pra turma sem dado.

**S1 — `/secretaria` real:**
- Nova camada `src/lib/secretaria/queries.ts` — espelha o padrão do teacher.
- `loadNetworkKpis()` agrega rede inteira por tenant: total alunos, engajados últimos 7d, professores (via memberships), escolas, turmas, em risco e proficiência média.
- `loadSchoolsHealth()` exportada mas ainda não renderizada (IDEB/indicadores Nexus em baixo seguem mock — gov data que não temos no DB).
- Página agora exige `requireRole("secretaria")` e KPIs do topo são reais.

**P2 — `/professor/copiloto` com LLM:**
- Novo prompt `src/lib/llm/prompts/lesson-plan.ts` v1.0 — estrutura abertura/investigação/sistematização/avaliação + adaptações, BNCC obrigatória, realista pra rede municipal sem Smart TV.
- `gateway.ts` extendido pra injetar system prompt da capability `plan_generation` (Claude Haiku 4.5 via OpenRouter, fallback mock).
- Novo route handler `/api/lesson-plan` (POST, SSE stream) — exige sessão professor/coordenador/diretor/orientador.
- `copiloto/page.tsx` virou Server Component que delega pra `CopilotoClient` — formulário (disciplina/série/tema/duração) + área de streaming com cursor blinking. Sem persistência ainda (planos não salvam no DB nessa iteração).
- Build/lint limpos.

**Por quê**: P5 era a tela diária do professor (perfeito pra demonstrar valor numa visita à secretaria), S1 era a vitrine pro prefeito ver a rede, P2 era o primeiro contato real com IA na área do professor. Juntas formam uma demo coerente.

**Ainda mockados/pendentes:**
- /professor: alertas (`ALERTAS_PROF`), próximas aulas, P3 (correção), P4 (provas), P6 (perfil aluno), P7 (diário), P8 (biblioteca)
- /secretaria: IDEB gráfico, Indicadores Nexus, tabela "Escolas em risco" (precisaria de IEB no DB)
- Planos de aula gerados não persistem ainda
- Telas Admin N2-N9: intocadas

---

## 2026-05-15 — Dashboard P1 do Professor com dado real + seed da rede

- **Seed expandido** `src/lib/db/seed-network.ts`: cria users de Ricardo/Cláudia/Bruno, `memberships` por papel (Ricardo escopado em `class-demo-7a`), 12 alunos do 7º A (João identificado e linkado ao user `u-joao`), 9 habilidades BNCC, e `student_proficiency` por aluno×habilidade com score jitter realista.
- **Camada `src/lib/teacher/queries.ts`** com helpers graceful:
  - `loadTeacherContext(userId, tenantId)` — turmas que o professor leciona via `memberships`.
  - `loadDashboardKpis()` — total de alunos, engajados nos últimos 7 dias (via `conversations.updatedAt`), em risco (avg de proficiência < 0.45).
  - `loadTopStudents()` — top 3 por proficiência média.
- **P1 (`/professor`) refatorado** pra Server Component com dados reais do DB. KPIs, destaque da turma e nome do professor vêm da sessão+DB; alertas continuam mockados (próxima sessão).
- **`scoreToProficiency()`** helper que mapeia score numérico (0..1) pra enum `proficiency` do schema, mantendo o `ProfBadge` UI.
- Build/lint limpos.

**Por quê**: P1 era o "olá Ricardo" mockado — perfeito pra demo mas inútil pra valida operação real. Agora se eu logo como Cláudia/Bruno cai em rota errada; logo como Ricardo vejo turma de verdade. Destrava P5 (turma), P6 (perfil aluno) e copiloto LLM nas próximas sessões.

**Ainda mockados em /professor**: alertas (`ALERTAS_PROF`), próximas aulas, ferramentas LLM (P2/P3/P4) e telas /alunos /turma /diario /biblioteca.

---

## 2026-05-15 — Tenants vêm do DB (com fallback in-code)

- **`getCurrentTenant()` agora carrega do Postgres** via `loadTenantFromDb(id)`, cacheado por request com React `cache()`.
- **Seed idempotente** `ensureTenantsSeeded()` em `src/lib/tenants/db.ts` insere as 3 prefeituras (`alfenas`, `pousoalegre`, `varginha`) no primeiro carregamento de qualquer request — `onConflictDoNothing`, executa só uma vez por instância.
- **Fallback gracioso**: sem `DATABASE_URL` ou row inexistente, devolve a config in-code (`TENANTS` em `config.ts`) com o mesmo shape. Nada quebra em dev sem DB.
- **Campos derivados** (`population`, `students`, `teachers`, `schools`) continuam vindo do in-code overlay até termos COUNT real — DB hoje não armazena agregados.
- `resolveTenantId()` extraído pra função privada — separação clara entre "qual tenant é?" (headers/cookies) e "carrega o tenant" (DB+fallback).
- Build/lint limpos.

**Por quê**: era pré-requisito pro Wizard de Onboarding (N3) — adicionar prefeitura agora vai ser um INSERT, não um deploy de código. Também alinha o app à arquitetura final (DB como source of truth) sem virar refator de big-bang.

**Ainda pendente** (próximas iterações):
- RLS enforcement real (políticas existem no SQL mas conexão atual bypassa).
- Contagens reais de students/teachers/schools via COUNT em vez de in-code.

---

## 2026-05-15 — Auth real por papel: layouts protegidos, ownership real, redirect por role

- **Layouts protegidos**: `/aluno`, `/professor`, `/secretaria`, `/admin` agora usam `requireRole(...)` no Server Component — não logado vira redirect pra `/entrar?callbackUrl=<rota>`, papel errado vira redirect pra própria home do papel.
- **`/api/chat` exige sessão**: retorna 401 se não logado, 403 se não-aluno. `studentId` agora vem de `resolveStudentId(userId, tenantId)` em vez de `ensureDemoStudent()` hardcoded.
- **Ownership real** das conversations: validação por `studentId` derivado da sessão. Antes era teatro — qualquer um abrindo `/aluno/chat` era tratado como u-joao.
- **Login redireciona por papel**: form chama `getSession()` pós-signIn, lê `role`, vai pra `getLayerHomePath(role)`. Demo aluno → `/aluno/chat`, professor → `/professor`, etc.
- **`x-pathname` header** adicionado no middleware pra `requireAuth` montar `callbackUrl` correto sem ler `request.url`.
- **`src/lib/auth/session-paths.ts`** separado de `session.ts` pra ser client-safe (form usa esse import; o server-only `session.ts` importa `headers` e `redirect`).
- **`src/lib/db/student-resolver.ts`**: helper único pra resolver `studentId` da sessão — para `u-joao` chama `ensureDemoStudent` (compat retro), para outros faz lookup em `students` por `userId+tenantId`. Sem `DATABASE_URL` ou sem match: retorna `null` (chat continua streamando efêmero).
- Build/lint limpos.

**Por quê**: a ownership do chat era teatro e qualquer um logado ou não era tratado como `u-joao`. Sem login real não dá pra validar permissões, testar 2º aluno, nem montar Professor/Secretaria de verdade. Esta camada destrava as próximas (multi-tenant real, onboarding).

**Lembrete pra produção**: `NEXTAUTH_SECRET` precisa ser configurado na Vercel (hoje cai no `"dev-only-secret-replace-me"`). Sem isso, tokens JWT são adivinháveis.

---

## 2026-05-15 — Loop do Aluno fechado: chat persiste e histórico vem do DB

- **API `/api/chat`** agora cria `conversation`, persiste mensagem do user antes do streaming, persiste mensagem do assistente (com model/tokens/latência) ao terminar e bumpa `updatedAt`. Aceita `conversationId` opcional para continuar conversa existente; valida ownership por `studentId`.
- **Novo SSE chunk** `{ type: "meta", conversationId }` enviado no início do stream — cliente atualiza URL via `history.replaceState` pra `?id=...` (refresh preserva conversa).
- **`/aluno/historico`** lê do Postgres via `listConversations()`, agrupa por bucket de data (Hoje/Ontem/Esta semana/Este mês/Anteriores), com empty state quando vazio. Removido mock `GROUPS` hardcoded.
- **`/aluno/chat?id=<uuid>`** carrega mensagens persistidas via `loadMessages()` + valida ownership.
- **Camada nova `src/lib/chat/persistence.ts`** com helpers graceful (sem `DATABASE_URL` retornam null/[] sem quebrar UX de demo).
- **Seed idempotente `src/lib/db/seed-demo.ts`** garante que o demo aluno (`u-joao`) tem rows em `users`, `schools`, `classes`, `students` antes do primeiro insert em `conversations` (FK obrigatória).
- Build/lint limpos.

**Por quê**: era a próxima feature de maior alavanca — A2 streaming já funcionava mas era efêmero, A3 era totalmente mockado. Agora o loop core do produto (chat → histórico → reabrir conversa) roda de ponta a ponta.

---

## 2026-05-15 — Setup de docs vivos (contexto, arquitetura, histórico)

- Criados `docs/contexto.md`, `docs/arquitetura.md`, `docs/historico.md`.
- `CLAUDE.md` agora exige leitura desses 3 arquivos antes de programar e atualização depois.
- Objetivo: evitar que sessões novas de agente quebrem trabalho já feito por falta de contexto sobre o estado real do código.

---

## Histórico anterior (consolidado do git log)

Antes deste arquivo existir. Reconstrução resumida — para detalhe ver `git log`.

- **2026-05-14** — Migrations aplicadas no Neon (pgvector, schema, índices).
- **chore** — Vercel forçada na região `gru1` (São Paulo).
- **refactor** — LLM gateway migrado pra OpenRouter (substitui chamada Anthropic direta).
- **feat** — Storage abstrato + Vercel Blob + upload de foto no chat.
- **feat** — NextAuth v5 com credenciais demo + página de login.
- **feat** — LLM gateway com mock provider + chat streaming real.
- **feat** — Drizzle schema multi-tenant + Neon serverless.
- **refactor** — Área Aluno como webapp tipo Claude (sem phone frames).
- **feat** — Telas Admin N2-N9 completas.
- **feat** — Telas Secretaria S1-S9 com dashboards estratégicos.
- **feat** — Telas Professor P1-P8 com dados mockados.
- **feat** — Telas Aluno A1-A6 (onboarding, chat, histórico, trilha, mural, a11y).
- **feat** — Mock data layer com tipos do domínio.
- **feat** — Multi-tenant foundation com white-label dinâmico.
- **feat** — Layout shell (sidebar + topbar) e rota `/admin` de demo.
- **feat** — Design system inicial + rota `/internal` de visualização.
- **feat** — Migra design tokens e fontes do protótipo.
- **docs** — Renomeado para Nexus Education e adiciona roadmap completo.
- **chore** — Scaffold Nexus Governamental com Next.js 16.
