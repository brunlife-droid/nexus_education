# Contexto atual

> **Atualizar este arquivo sempre que o estado do projeto mudar.** Foto rápida do que está pronto, o que está em andamento e o que ainda não foi tocado.
>
> Última atualização: 2026-05-15

---

## O que está funcional hoje

- Scaffolding Next.js 16 + React 19 + TypeScript + Tailwind v4
- Drizzle + Neon Postgres com pgvector + migrations aplicadas
- LLM gateway via OpenRouter (Claude Haiku 4.5 primário) — `src/lib/llm/`
- NextAuth v5 com credenciais demo + página de login
- Storage abstrato + Vercel Blob (upload de foto no chat)
- Telas mockadas: Aluno (A1-A6), Professor (P1-P8), Secretaria (S1-S9), Admin (N2-N9)
- Multi-tenant foundation (middleware + tabela `tenants` + tokens CSS por tenant)
- Deploy Vercel forçado em `gru1` (São Paulo)
- **Loop do Aluno completo**: chat A2 persiste no DB (conversations + messages), histórico A3 lê do Postgres com agrupamento por data, `?id=` reabre conversa antiga. Graceful sem `DATABASE_URL` (cai pra modo efêmero).
- **Auth real enforced**: `/aluno`, `/professor`, `/secretaria`, `/admin` exigem sessão via `requireRole(...)` no layout. `/api/chat` retorna 401/403 sem sessão. Login redireciona por papel pra `getLayerHomePath(role)`. Ownership de conversation validada por `studentId` da sessão (não mais teatro).
- **Tenants do DB**: `getCurrentTenant()` lê do Postgres com seed idempotente das 3 prefeituras. Fallback in-code se não houver `DATABASE_URL`. White-label dinâmico funciona (`?tenant=pousoalegre` muda cores/nome do tutor).
- **Seed da rede (Alfenas 7º A)**: 3 demo non-students (Ricardo prof, Cláudia sec, Bruno admin) + memberships, 12 alunos no 7º A (João linkado ao user), 9 habilidades BNCC, proficiência por aluno×habilidade.
- **Dashboard P1 do Professor real**: KPIs (engajados na semana, em risco por proficiência <0.45, total na turma) e destaques (top 3 por avg proficiency) vêm do DB. Alertas, próximas aulas e ferramentas LLM ainda mockados.

## O que está mockado / não funcional ainda

- Contagens (`students`, `teachers`, `schools`) do Tenant ainda vêm do in-code overlay — DB não tem agregados
- RLS escrita no SQL mas conexão atual bypassa (queries rodam como owner; políticas existem mas não enforçam)
- P2 (copiloto plano de aula), P3 (correção redação), P4 (gerar prova): só telas, sem LLM real plugado
- P5 (dashboard turma), P6 (perfil aluno), P7 (diário), P8 (biblioteca): mockados
- Telas Secretaria S1-S9 e Admin N2-N9: mockadas
- WhatsApp, OCR, áudio, PDF, RAG: nada começado
- `audit_log`, `consent_log`: schema existe, sem writes
- Busca/filtros do histórico A3 são UI estática (não filtram nada ainda)
- `NEXTAUTH_SECRET` está em fallback inseguro (`"dev-only-secret-replace-me"`) — precisa setar na Vercel pra produção

## Próximos passos sugeridos (em discussão)

Ver `docs/ROADMAP.md` Fase 1 — o foco natural agora é fechar o loop do Aluno (chat real + persistência + histórico do DB).

## Decisões em aberto

Ver `docs/ROADMAP.md` seção 5 ("Decisões críticas pendentes").

## Gotchas / pegadinhas

- **Next.js 16 ≠ Next.js 14**. Convenção `middleware` foi renomeada pra `proxy`. Ler `node_modules/next/dist/docs/` antes de mexer em rotas, middleware, ou config.
- **Sempre filtrar por `tenantId`**. Nunca escrever query sem isso. RLS é a segunda barreira, não a primeira.
- **LLM nunca direto do componente**. Tudo via `src/lib/llm/gateway.ts`.
