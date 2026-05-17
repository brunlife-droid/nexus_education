# Setup · variáveis de ambiente e banco

Este documento descreve como conectar o app aos serviços externos. Tudo é **opcional para Fase 0** — o app roda inteiramente com dados mockados sem nenhuma credencial.

## Variáveis necessárias

Crie `.env.local` na raiz (não vai pro Git):

```bash
# ─── Banco de dados (Bloco G) ──────────────────────────────────
# Obtenha em https://console.neon.tech (plano grátis basta para começar)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/nexus?sslmode=require"

# ─── LLM (Bloco H) ─────────────────────────────────────────────
# OpenRouter — gateway unificado para Claude, GPT, Gemini, Llama.
# Uma única chave dá acesso a TODOS os modelos roteados (chat, plano,
# correção, BNCC, SRE). Switch entre modelos = mudar string em routes.ts.
OPENROUTER_API_KEY="sk-or-v1-..."
# Opcional: enviado como HTTP-Referer (aparece nas analytics do OpenRouter)
OPENROUTER_SITE_URL="https://claude-code-teste.vercel.app"

# Opcional (apenas embeddings — OpenRouter não roda embeddings)
OPENAI_API_KEY="sk-..."

# ─── Auth (Bloco I) ────────────────────────────────────────────
NEXTAUTH_SECRET="gere com: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"  # produção: https://seu-dominio

# ─── Storage (Bloco J) ─────────────────────────────────────────
# Railway Bucket / S3 compativel
AWS_ENDPOINT_URL="https://t3.storageapi.dev"
AWS_S3_BUCKET_NAME="functional-holder"
AWS_DEFAULT_REGION="auto"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

## Habilitando Railway Bucket/S3

1. Railway → projeto → **Add** → **Bucket**
2. Deploy do bucket no ambiente desejado
3. Abra **Credentials** → **Add to Service**
4. Escolha o servico do app e o preset **AWS SDK (Generic)**

Sem variaveis S3, uploads caem no provider mock local (data URL para imagem pequena ou placeholder).

Na Vercel, configure essas mesmas variáveis em **Project Settings → Environment Variables**.

## Conectando o Neon (primeira vez)

```bash
# 1. Crie projeto em https://console.neon.tech
# 2. Copie a connection string para DATABASE_URL no .env.local
# 3. Aplique a preparação manual (pgvector + GUC):
psql "$DATABASE_URL" -f drizzle/migrations/0000_prepare_pgvector_and_rls.sql

# 4. Gere e aplique o schema base:
npm run db:push

# 5. Aplique as políticas RLS:
psql "$DATABASE_URL" -f drizzle/migrations/9999_rls_policies.sql
```

A partir daí, mudanças em `src/lib/db/schema.ts` são aplicadas com `npm run db:push`. Para gerar migrations versionadas (recomendado em produção), use `npm run db:generate` e revise o SQL antes.

## Como o app usa as credenciais

| Variável | Quando é necessária |
|---|---|
| `DATABASE_URL` | A partir do Bloco G — quando começamos a salvar conversas, alunos, etc. de verdade |
| `OPENROUTER_API_KEY` | A partir do Bloco H — sem isso, o chat usa um mock provider que devolve respostas plausíveis. Obtenha em https://openrouter.ai/keys |
| `NEXTAUTH_SECRET` | A partir do Bloco I — sem isso, auth está em "modo dev" e qualquer usuário entra como demo |
| `AWS_ENDPOINT_URL`, `AWS_S3_BUCKET_NAME`, `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Storage S3 privado no Railway para chat multimodal e materiais da turma |

Todos os clientes (db, llm, auth) têm fallback: se a variável não existir, lançam erro descritivo somente quando alguém tenta usar. **Build, lint e renderização de páginas funcionam sem nenhuma credencial.**
