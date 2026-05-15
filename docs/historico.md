# Histórico

> **Adicionar uma entrada nova no TOPO depois de qualquer mudança de código.** Foco no *porquê* e em consequências, não em detalhes triviais que o `git log` já tem.
>
> Formato: `## YYYY-MM-DD — título curto` + bullets.

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
