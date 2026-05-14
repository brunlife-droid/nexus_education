# Nexus Education

Plataforma de IA pedagógica multi-tenant para redes municipais de educação no Brasil.

- **Tutora IA por prefeitura** (white-label): cada cidade tem sua tutora com nome, voz e identidade visual próprios.
- **Canal principal: WhatsApp Business** + PWA mobile-first para alunos.
- **Copiloto para professores**: gera plano de aula, corrige redação, cria provas — em minutos.
- **Dashboards para secretarias**: drill-down rede → escola → turma → aluno, indicadores Nexus + IDEB.
- **LGPD-first**: trilha de auditoria completa, protocolo socioemocional (SRE-1) auditável.

> Veja [`docs/ROADMAP.md`](./docs/ROADMAP.md) para o plano completo: arquitetura, fases, equipe e custos.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- TypeScript + Tailwind CSS v4
- Multi-tenant via subdomínio + tokens CSS por tenant
- Postgres (Neon) + Drizzle ORM + pgvector para RAG
- AI SDK (Vercel) com switch de provedor: Claude Haiku 4.5 · Gemini 2.5 Flash · GPT-4o mini

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando         | O que faz                            |
| --------------- | ------------------------------------ |
| `npm run dev`   | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção             |
| `npm run start` | Roda o build de produção             |
| `npm run lint`  | Roda o linter                        |

## Estrutura (atual)

```
src/
  app/
    layout.tsx
    page.tsx       # landing institucional (provisória)
    globals.css
docs/
  ROADMAP.md       # plano completo do produto
```

A estrutura final (com as 4 camadas: aluno, professor, secretaria, admin) está descrita no roadmap.
