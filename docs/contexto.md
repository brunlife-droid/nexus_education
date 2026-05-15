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

## O que está mockado / não funcional ainda

- White-label dinâmico carregado por tenant — só 1 tenant hardcoded
- RLS escrita no SQL mas não validada com testes
- Login real por papel (Aluno/Prof/Secretaria/Admin) — só demo (auth não enforced em `/aluno/*`)
- Aluno demo `u-joao` é hardcoded — todo chat é atribuído a ele independente de quem está logado
- WhatsApp, OCR, áudio, PDF, RAG: nada começado
- `audit_log`, `consent_log`: schema existe, sem writes
- Busca/filtros do histórico A3 são UI estática (não filtram nada ainda)

## Próximos passos sugeridos (em discussão)

Ver `docs/ROADMAP.md` Fase 1 — o foco natural agora é fechar o loop do Aluno (chat real + persistência + histórico do DB).

## Decisões em aberto

Ver `docs/ROADMAP.md` seção 5 ("Decisões críticas pendentes").

## Gotchas / pegadinhas

- **Next.js 16 ≠ Next.js 14**. Convenção `middleware` foi renomeada pra `proxy`. Ler `node_modules/next/dist/docs/` antes de mexer em rotas, middleware, ou config.
- **Sempre filtrar por `tenantId`**. Nunca escrever query sem isso. RLS é a segunda barreira, não a primeira.
- **LLM nunca direto do componente**. Tudo via `src/lib/llm/gateway.ts`.
