# Nexus Education — Roadmap completo

> Plano vivo. Atualizar conforme decisões mudam. Última revisão: 2026-05-14.

## 1. Visão

**O que é.** Plataforma SaaS multi-tenant white-label que entrega, para cada rede municipal de educação no Brasil, uma tutora IA pedagógica para alunos (acessível via WhatsApp e PWA), um copiloto para professores e dashboards estratégicos para secretarias.

**Quem usa.**
- **Aluno** (9-15 anos): tira dúvida, faz dever, estuda pra prova — pelo WhatsApp ou app mobile.
- **Professor**: gera plano de aula, corrige redação, cria provas, acompanha turma.
- **Secretaria**: monitora rede, drill-down até aluno, comunica com prefeito/imprensa.
- **Admin Nexus** (interno): onboardeia prefeituras, monitora LLMs, fatura.

**Diferenciais.**
1. **White-label de verdade**: cor, nome do tutor, voz, monograma — tudo por prefeitura via CSS vars + config.
2. **WhatsApp como canal principal** (80% do tráfego do aluno): atende ao Brasil real.
3. **Pedagogia socrática**: tutor não entrega respostas prontas — guia.
4. **LGPD + auditoria**: cada interação rastreável; protocolo socioemocional (SRE-1) com trilha completa.
5. **Multi-LLM com switch sem deploy**: roteamento por capability + fallback automático.

**Modelo de negócio.** SaaS B2G (Business to Government). Cobrança por aluno ativo/mês via empenho municipal. Plano Standard ~R$ 4,80/aluno/mês. Unit economics-alvo: margem bruta ≥ 85% após custos de LLM.

---

## 2. Arquitetura

### 2.1 Stack escolhida

| Camada | Tecnologia | Por quê |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | Server Actions, streaming nativo, edge runtime — encaixa em LLM e dashboards |
| Linguagem | TypeScript | Segurança de tipos em sistema multi-tenant é não-negociável |
| Estilização | Tailwind CSS v4 + CSS vars semânticas | Tokens do design system viram CSS vars; white-label por tenant é trivial |
| UI | shadcn/ui (a adotar gradualmente) | Componentes acessíveis, copiáveis, sem lock-in |
| DB | Postgres (Neon serverless) | Confiável, RLS nativo, pgvector para RAG no mesmo DB |
| ORM | Drizzle | Type-safe SQL, edge-compatible, mais rápido que Prisma |
| Auth | NextAuth v5 | Email/password + Google + (futuro) Gov.br |
| LLM gateway | Vercel AI SDK | Streaming nativo, multi-provider abstrato |
| RAG | pgvector + embeddings (Voyage AI ou text-embedding-3) | Único DB, sem mais infra |
| Storage | Railway Bucket/S3 | Fotos de exercício, áudios, PDFs gerados |
| PDF | `@react-pdf/renderer` | Componentiza PDF como React — mantém design |
| Mensageria | Inngest ou QStash | Jobs assíncronos (geração de PDF, indexação RAG) |
| Observability | Sentry + Vercel Analytics + custom (tokens/cost) | Erros + UX + custo LLM |
| WhatsApp | Meta Cloud API direto | Mais barato e flexível que Twilio em escala |
| Hosting | Vercel (Next.js) + Neon (DB) — fase inicial | Migrar parte para nuvem nacional quando contratos exigirem |

### 2.2 Multi-tenancy

**Decisão**: single Postgres com `tenant_id` em todas as tabelas + **Postgres Row-Level Security (RLS)** para isolamento. Não usar schema-per-tenant (overhead operacional inviável em 50+ tenants).

**Resolução de tenant**:
- Por subdomínio (`alfenas.nexus.edu`, `pousoalegre.nexus.edu`) em produção
- Por path/header (`/t/alfenas`) em dev/preview
- Middleware Next.js identifica e injeta `tenantId` no contexto da request

**Tabela `tenants`**: id, subdomain, nome, cor primária/secundária, monograma, nome do tutor, voz TTS, status (ativo/trial/onboarding), plano, billing config.

**White-label**: cada page carrega tokens CSS do tenant via `<style>` injetado no layout (raiz). Sem rebuild.

### 2.3 LLM Gateway interno

Não chamar provedores direto dos componentes. Tudo passa por `src/lib/llm/`:

```
llm/
  gateway.ts        # roteamento por capability + fallback
  providers/
    anthropic.ts
    google.ts
    openai.ts
  capabilities/
    chat-student.ts        # → claude-haiku-4-5
    plan-generation.ts     # → claude-haiku-4-5
    essay-correction.ts    # → gpt-4o-mini
    embeddings.ts          # → voyage-3
  prompts/
    student-tutor.v4.2.ts  # versionado, override por tenant
  observability.ts  # log tokens, latência, custo por tenant
```

**Switch sem deploy** (visão N7): tabela `llm_routes` controla qual modelo serve cada capability. Mudança ali é instantânea.

### 2.4 RAG

**Bibliotecas**:
- **Nacional** (read-only para todos): BNCC, Currículo Referência MG, banco SAEB, guia BNCC socioemocional.
- **Por prefeitura** (read-write): materiais didáticos próprios, comunicados, regulamentos.
- **Por escola** (futuro): planos de aula da escola, regimento interno.

**Pipeline**:
1. Upload (admin/prefeitura) → `documents` table (status: pending)
2. Worker assíncrono: chunking (semântico, ~512 tokens com overlap), embedding, `chunks` table com vector
3. Indexação completa → status: indexed
4. Retrieval em runtime: query + filtro `tenant_id IN (nacional, tenant_atual)` + top-k cosine

**Qualidade**: tracking de retrieval_quality por documento (N5) — chunks usados em respostas com thumbs-up sobem o score.

### 2.5 Auth + roles

**Tipos de usuário**: aluno, responsavel, professor, coordenador, diretor, secretaria, admin_nexus.

**Roles por tenant**: usuário pode ser membro de múltiplos tenants (raro, mas possível para CSM). Tabela `memberships(user_id, tenant_id, role)`.

**Onboarding de aluno**: invite-based — escola cadastra alunos via CSV, sistema envia link de ativação por WhatsApp ou e-mail do responsável. Aluno não pode auto-cadastrar.

**Gov.br** (futuro): integração via OIDC quando atingirmos escala que justifica. Importante para credibilidade institucional, mas não bloqueante para MVP.

### 2.6 LGPD + auditoria

**Tabela `audit_log`**: toda ação sensível (login, leitura de dados de aluno, envio de mensagem, alerta SRE) gera evento.

**Consentimento de responsável**: registrado em `consent_log` com timestamp, IP, versão do termo, escopo.

**Anonimização**: aluno tem direito de solicitar exclusão; pipeline anonimiza histórico (substitui PII por hash) sem perder os dados pedagógicos agregados.

**Protocolo SRE-1**: classificador NLP detecta marcadores de risco (bullying, sofrimento, ideação suicida). Aciona workflow:
1. IA muda de tom (acolhe sem invadir)
2. Pede consentimento para escalar
3. Notifica orientador da escola
4. Caso fica em monitoramento (auditável pela secretaria)
5. Família contatada em 24h se ação não for tomada

### 2.7 Hosting & compliance nacional

**Realidade**: contratos com prefeituras podem exigir hospedagem em nuvem nacional (LGPD + edital).

**Plano**:
- **MVP / pilotos pagos pequenos**: Vercel + Neon (US-East ou EU). LGPD-compliant tecnicamente mas pode não atender exigência contratual de "dados em território nacional".
- **Escala (10+ prefeituras)**: migrar para **AWS São Paulo** (Vercel não tem região BR) ou **GCP São Paulo**. Considerar **TIVIT** ou **Locaweb** se algum edital exigir provedor com sede no Brasil.
- **Apartar dados PII**: PII sempre em região BR; metadados/agregados podem viver em outra região.

Decisão a tomar antes da fase 4 (Admin Nexus / N4).

---

## 3. Fases

Cada fase tem objetivo, escopo, entregáveis e duração estimada. Sequência é a recomendada, mas P1/P2 podem rodar em paralelo se houver 2 devs.

### Fase 0 — Foundation (2 semanas)

**Objetivo**: base técnica antes de qualquer feature de produto.

- [ ] Migrar tokens CSS do protótipo (`styles.css`) para `globals.css` do Next.js
- [ ] Setup Drizzle + Neon Postgres (com pgvector)
- [ ] Setup NextAuth com email/password
- [ ] Estrutura multi-tenant: middleware de subdomínio + `tenants` table + RLS
- [ ] Design system inicial como componentes (Button, Card, Badge, Avatar)
- [ ] Layout primitivo: sidebar + topbar + main (igual `app.jsx` do protótipo)
- [ ] Storybook ou rota `/_internal/ds` para visualizar componentes
- [ ] CI/CD: testes (Vitest), lint, typecheck no Vercel preview
- [ ] Sentry para erros + logging básico

**Entrega**: aplicação roda com 1 tenant hardcoded, login funciona, design system está navegável.

### Fase 1 — MVP Aluno (4 semanas)

**Objetivo**: 1 prefeitura piloto, 1 turma real fazendo dever via web.

- [ ] A1 · Onboarding (welcome + termo + dados confirmados)
- [ ] A2 · Chat principal com **streaming Claude Haiku 4.5**
- [ ] A3 · Histórico agrupado por dia/disciplina
- [ ] A6 · Acessibilidade (dislexia, TDAH, easy-read) — alavanca diferencial
- [ ] LLM gateway com 1 provider (Anthropic) + observability básica
- [ ] Prompts versionados (system prompt v1.0)
- [ ] Classificação BNCC automática (chamada extra ao LLM)
- [ ] Persistência de conversas + memória de aluno (perfil)
- [ ] White-label funcionando para 1 tenant (cor + nome do tutor)

**Não inclui ainda**: WhatsApp, OCR, áudio, trilha de aprendizagem, mural.

**Entrega**: piloto fechado com 1 turma. Métrica de sucesso: 60%+ alunos completam ≥1 sessão de estudo por semana.

### Fase 2 — Professor (6 semanas)

**Objetivo**: professor da turma piloto adota a plataforma como ferramenta diária.

- [ ] P1 · Dashboard (KPIs, alertas, atalhos)
- [ ] P2 · Copiloto de plano de aula com streaming
- [ ] P3 · Correção de redação assistida (GPT-4o mini)
- [ ] P5 · Dashboard da turma (heatmap de habilidades)
- [ ] P6 · Perfil de aluno (visão consolidada para o professor)
- [ ] **RAG**: indexar BNCC + Currículo MG + permitir upload por professor
- [ ] LLM gateway com 2 providers (Anthropic + OpenAI) + fallback
- [ ] Biblioteca compartilhada da rede (planos curtidos viram referência)

**Entrega**: professor reduz tempo de planejamento em ≥40%. Mais um sinal forte para o piloto fechar contrato.

### Fase 3 — Secretaria (6 semanas)

**Objetivo**: secretária consegue justificar valor para o prefeito.

- [ ] S1 · Dashboard estratégico (KPIs rede, mapa de escolas, alertas)
- [ ] S2 · Drill escola
- [ ] S3 · Drill turma
- [ ] S4 · Drill aluno
- [ ] S5 · **Relatório mensal PDF** (geração com `@react-pdf/renderer`)
- [ ] Indicadores Nexus (IEP, IRA, TPL, SRE, IEQ) — cálculo + tracking histórico
- [ ] Mural de comunicação (S6)

**Entrega**: secretária envia relatório PDF brandeado para prefeito todo mês. Material de venda para próximas prefeituras.

### Fase 4 — Admin Nexus (6 semanas)

**Objetivo**: você (admin) onboardeia uma 2ª e 3ª prefeitura sem dor.

- [ ] N1 · Dashboard de negócio (ARR, MRR, churn, health)
- [ ] N2 · Lista de prefeituras + filtros
- [ ] N3 · **Wizard de onboarding em 5 passos** (provisionamento automático)
- [ ] N4 · Perfil da prefeitura
- [ ] N6 · Financeiro (faturas, NF-e, cobrança via empenho)
- [ ] N7 · Observabilidade LLM (latência, custo, switch sem deploy)
- [ ] N8 · Feature flags + prompt versioning
- [ ] N9 · Suporte/CSM (tickets, onboardings em andamento)
- [ ] Provisioning automatizado: subdomínio + DB + cópia BNCC + tokens CSS

**Entrega**: capacidade de operar 5-10 prefeituras simultaneamente sem virar gargalo.

### Fase 5 — WhatsApp Business (6 semanas)

**Objetivo**: 80% do tráfego do aluno vem por aqui — sem isso, produto não escala.

- [ ] Setup Meta Business + aprovação de número da prefeitura
- [ ] Templates aprovados pela Meta (boas-vindas, lembrete, comunicado, SRE)
- [ ] Webhook handler (Next.js API route)
- [ ] Estado conversacional **compartilhado** entre web e WhatsApp (mesma `conversations` table)
- [ ] Suporte a botões interativos (3 opções)
- [ ] Suporte a recebimento de mídia (foto + áudio — mas ainda sem processar conteúdo nessa fase)
- [ ] Notificações automáticas (lembrete de dever, comunicado da escola)

**Entrega**: aluno alterna web ↔ WhatsApp sem perder contexto. Adoção 3-5x maior.

### Fase 6 — Multimodal (6 semanas)

**Objetivo**: aluno tira foto da questão, manda áudio, recebe áudio.

- [ ] **OCR** de foto de exercício (Claude Vision ou Gemini Flash multimodal)
- [ ] **STT** (Speech-to-Text) para entrada de áudio — provavelmente Google ou Whisper API
- [ ] **TTS** (Text-to-Speech) com voz por tenant — ElevenLabs ou Google TTS BR
- [ ] Detecção de equações em foto + LaTeX rendering
- [ ] Cache de áudios gerados (mesmo prompt → reusa)

**Entrega**: experiência multimodal completa. Major differentiator de venda.

### Fase 7 — LGPD + SRE socioemocional (3 semanas)

**Objetivo**: passar em auditoria de qualquer secretaria e proteger alunos vulneráveis.

- [ ] `audit_log` completo (todos eventos sensíveis)
- [ ] `consent_log` + versionamento de termos
- [ ] Workflow de anonimização sob demanda
- [ ] Classificador NLP SRE-1 (fine-tuning de Haiku ou Gemini)
- [ ] Protocolo de acolhimento + escalonamento (caso #2026-XXXX)
- [ ] Alertas para orientador + secretaria
- [ ] Painel de auditoria para secretaria

**Entrega**: produto "auditoria-ready" para qualquer prefeitura.

### Fase 8 — Scale & Hardening (contínuo)

- [ ] Prompt caching agressivo (Anthropic suporta — pode cortar 50% do custo de tokens)
- [ ] Edge caching de RAG (responses cacheadas por hash de prompt)
- [ ] Backups + DR (PITR no Neon)
- [ ] Migração para nuvem nacional (se contratos exigirem)
- [ ] SOC 2 (futuro distante)
- [ ] Mobile nativo via Capacitor (se PWA não bastar)

---

## 4. Equipe e custos

### 4.1 Time mínimo recomendado

| Fase | Pessoas | Perfil |
| --- | --- | --- |
| 0-1 | 1-2 | Fullstack senior + você (PM/CEO) |
| 2-3 | 2-3 | + 1 fullstack para professor/secretaria |
| 4-5 | 3 | + 1 backend para multi-tenant + WhatsApp |
| 6-7 | 3-4 | + 1 ML/IA para multimodal e SRE |
| 8+ | 4-5 | + 1 SRE/DevOps quando virar 20+ tenants |

**Alternativa lean**: você + Claude Code (esta sessão e outras). Cronograma estica ~30%, mas viável para validar produto antes de levantar capital ou contratar.

### 4.2 Custos de infraestrutura (estimativa mensal)

Para **10.000 alunos ativos** em 2-3 prefeituras:

| Item | Custo |
| --- | --- |
| Vercel Pro | ~R$ 100 |
| Neon Postgres Pro | ~R$ 150 |
| Railway Bucket/S3 (uploads) | custo variável conforme uso |
| Sentry Team | ~R$ 130 |
| LLM tokens (Claude Haiku, mix) | ~R$ 1.500 |
| Embeddings (Voyage) | ~R$ 100 |
| WhatsApp Cloud API (Meta) | ~R$ 200 |
| TTS (ElevenLabs ou Google) | ~R$ 300 |
| Domínio + SSL | ~R$ 30 |
| **Total** | **~R$ 2.500/mês** |

Receita a R$ 4,80/aluno × 10.000 = **R$ 48.000 MRR**.
Margem bruta: ~95% antes de salários, 60-70% após.

### 4.3 Custos críticos a controlar

- **LLM tokens**: maior variável. Mitigação: prompt caching, modelo certo para cada capability, RAG bem feito (menos contexto desperdiçado).
- **TTS**: cobra por caractere. Mitigação: cache agressivo + voz só onde realmente agrega.
- **WhatsApp**: cobra por conversa iniciada. Mitigação: maximizar conversas iniciadas pelo aluno (gratuitas) vs templates iniciados pelo sistema (pagos).

---

## 5. Decisões críticas pendentes

| # | Decisão | Quando precisa decidir | Quem decide |
| --- | --- | --- | --- |
| 1 | **Hosting nacional?** Se sim, qual provedor? | Antes da fase 4 (multi-tenant prod) | Você + jurídico da 1ª prefeitura |
| 2 | **WhatsApp direto na Meta ou via Twilio?** | Início da fase 5 | Engenharia (eu recomendo Meta direto) |
| 3 | **Pricing model**: por aluno ativo mensal? por aluno cadastrado? fixo? | Antes do 1º contrato pago | Comercial |
| 4 | **Termo do responsável**: como coletar formalmente em escala? | Fase 1 (piloto) | Jurídico + UX |
| 5 | **Voz do tutor**: ElevenLabs (qualidade) ou Google TTS BR (custo)? | Fase 6 | Produto + custo |
| 6 | **Fine-tuning vs prompting**: vale ter modelo próprio fine-tuned em conteúdo BNCC? | Fase 7+ | Engenharia + dados |
| 7 | **Cobertura curricular**: começa só ensino fundamental anos finais (6º-9º)? Quando expandir? | Estratégia de produto | Você |
| 8 | **Mobile**: PWA suficiente ou precisa de app nativo (Capacitor)? | Após fase 5 com dados de uso | Produto |

---

## 6. Riscos

### Técnicos
- **Custo de LLM em escala**: se margem cair abaixo de 70%, modelo não fecha. Mitigação: caching + roteamento + observability desde o dia 1.
- **Latência multimodal**: foto → OCR → resposta tem que vir em <5s. Se demorar, abandono.
- **WhatsApp throttling da Meta**: limites de mensagens iniciadas por dia em conta nova. Crescer com cuidado.

### Comerciais
- **Ciclo de venda público é longo**: piloto gratuito → empenho → 6+ meses. Caixa precisa aguentar.
- **Dependência de um campeão interno** (secretária ou diretor) na prefeitura: se sai, contrato vira pó.
- **Concorrência institucional**: Khan Academy, MEC, sistemas próprios das secretarias. Diferenciação tem que ser óbvia desde o piloto.

### Regulatórios
- **LGPD com menor de idade**: consentimento do responsável é mais complexo. Termo + UX caprichados.
- **Eleição municipal**: contratos podem ser revistos com nova gestão. Mitigação: contratos longos + champion na coordenação pedagógica (não-político).
- **Marco Civil + responsabilização**: se IA der conselho errado em assunto sensível, plataforma pode ser responsabilizada. Por isso o SRE-1 e a auditabilidade.

---

## 7. Princípios de execução

1. **Vender antes de construir o resto**: fase 1 já busca piloto pago. Tudo depois disso é melhorar produto que já tem cliente.
2. **Pedagogia ≠ Tecnologia**: time precisa de pedagogo desde cedo (não programador "que entende um pouco de educação").
3. **Mobile-first real**: testar tudo em Android barato, 3G, com tela rachada. Se não funciona aqui, não funciona.
4. **Auditabilidade default-on**: cada evento sensível gera log. Auditoria não é feature — é fundamento.
5. **Whitelabel é venda**: prefeitura quer ver a cor dela. Investir aqui dá ROI alto.
6. **WhatsApp é o produto**: para o aluno, web é fallback. Otimizar para Meta Cloud API.
7. **Não-infantilizar**: criança de 12 anos detesta ser tratada como criança de 6. Tom firme, respeitoso, brasileiro.

---

## 8. Marcos sugeridos

| Marco | Quando | Sinal |
| --- | --- | --- |
| **M1** — MVP Aluno + Professor live com 1 turma | Mês 3 | 1ª prefeitura assinou piloto (gratuito ou simbólico) |
| **M2** — 1º contrato pago | Mês 6 | Receita > R$ 0. Validação de pricing. |
| **M3** — 3 prefeituras pagas + multi-tenant operacional | Mês 12 | Modelo escala. Hora de captar / contratar. |
| **M4** — 10 prefeituras + WhatsApp + multimodal | Mês 18 | Produto completo. Margem comprovada. |
| **M5** — 50 prefeituras + infra nacional + SOC2-ready | Mês 30 | Categoria reconhecida. |

---

**Próximo passo concreto**: começar **Fase 0** (foundation técnica). Quando você der OK, eu abro um issue/PR por entregável e vou executando em sequência, commitando no `main` com previews na Vercel.
