# nexus_education — orientações de trabalho

Política vigente de 28/09/2026. AGENTS.md e CLAUDE.md têm conteúdo idêntico: consulte apenas um; se já estiver no contexto, use-o sem reler. Ao alterar estas regras, atualize as duas cópias e confira a igualdade. Esta política substitui as antigas exigências de leitura integral e revisões repetidas; os contratos do produto permanecem válidos.

## Escopo e contexto

- Confira branch, diff e arquivos envolvidos. Preserve o trabalho existente. Entenda o resultado pedido, o comportamento atual e como verificar a mudança; tarefa simples não exige plano formal.
- Use busca por assunto antes de abrir documentos grandes. Leia somente os trechos que influenciam a tarefa e amplie a leitura quando encontrar uma dependência ou risco concreto. Histórico serve para localizar decisões; não precisa ser relido inteiro no início ou no fim.
- Avalie o pedido com senso crítico. Pergunte somente por decisão de comportamento, escopo, risco, custo ou autorização que esteja faltando. Resolva escolhas técnicas rotineiras e preserve autorizações já dadas.
- Antes de editar, identifique contratos, consumidores e fluxos afetados, especialmente código compartilhado, permissões, dados e integrações. Preserve comportamentos existentes fora do escopo.

| Assunto | Onde consultar | Recorte |
| --- | --- | --- |
| Estado, mocks e pendências | `docs/contexto.md` | Consultar a parte afetada |
| Arquitetura e decisões ativas | `docs/arquitetura.md` | Consultar módulo e contrato |
| Origem de decisões e regressões | `docs/historico.md` | Buscar o assunto e suas últimas entradas |
| Nova feature e prioridades | `docs/ROADMAP.md` | Consultar a fase, dependências e riscos da feature |
| Preparação do ambiente | `docs/SETUP.md` | Somente quando a tarefa precisar do ambiente |

## Regras específicas do projeto

- Plataforma pedagógica com Aluno, Professor, Secretaria e Admin Nexus. Preserve tenant_id, tenant resolvido por subdomínio e RLS. Toda query precisa do escopo de tenant nos helpers/middleware; RLS é a segunda barreira.
- Ações sensíveis, acesso a dados de aluno, envio de mensagens e alertas SRE precisam de audit_log. Dados de menores exigem consentimento do responsável e proteção de PII.
- WhatsApp é o canal principal do aluno; web é fallback. UI mobile-first deve funcionar em Android simples e rede 3G; valide com throttling quando o fluxo visual mudar.
- Use o gateway src/lib/llm/ para IA; nunca chame provedores diretamente de componentes. Preserve white-label por variáveis CSS semânticas e configuração do tenant.
- Para código Next.js, consulte o guia pertinente da versão instalada em node_modules/next/dist/docs/ e seus avisos de depreciação. Não presuma APIs com base em versões anteriores.
- Use pt-BR em UI, erros, commits e respostas; identificadores em inglês. Tom institucional, firme e respeitoso, adequado à idade. Commits descritivos no imperativo.

## Implementação e validação

- Implemente a menor mudança completa que atende ao pedido. Diagnóstico ou revisão isolados permanecem em leitura. Melhorias paralelas só entram quando necessárias ao resultado autorizado.
- Valide a funcionalidade nova e os comportamentos existentes afetados, incluindo erros e acesso quando pertinentes. Mudança visível precisa ser exercitada no navegador pelo fluxo real afetado.
- Texto e orientações exigem conferir conteúdo, referências, igualdade dos dois guias, diff e ausência de segredos. Hook alterado exige sintaxe e comportamento verificados. Não instale dependências nem rode banco, build ou E2E do aplicativo só para editar documentos.
- Use os scripts existentes de lint, testes e build pertinentes à mudança. Em acesso a dados, cubra RLS e auditoria; em UI, valide o fluxo no navegador e as condições móveis aplicáveis.
- Checks remotos e proteções exigidos pelo repositório continuam obrigatórios. Não publique sucesso fictício nem reutilize evidência de outro commit, e não contorne proteções. Falha de ambiente pede diagnóstico antes de repetir a suíte; preserve processos e portas usados por outros trabalhos.
- Faça uma revisão final do diff. Após corrigir um achado, confira a correção e seus efeitos; nova auditoria completa exige alteração relevante, falha ou risco concreto ainda aberto. Quando pedido, revisão e gates aplicáveis estiverem atendidos, entregue.

## Publicação, dados e autorização

- Integre por PR na branch de destino vigente (main); não faça push direto, force-push ou exclusão dessa branch. Confirme o repositório e o ambiente antes de qualquer operação remota.
- Deploy, migrations, provisionamento, QA produtivo com escrita e comunicação com terceiros precisam estar cobertos pela autorização da conversa. Não peça novamente uma autorização já dada; não amplie seu escopo.
- Operações destrutivas exigem autorização explícita. Mudanças de dados precisam de impacto conhecido, backup recuperável e reversão quando aplicáveis. Rollback de código não autoriza sobrescrever dados novos com backup antigo.
- Preserve segredos, dados pessoais e limites de acesso. Credenciais ficam em ambiente restrito e arquivos ignorados, nunca em código, documentos, argumentos, logs ou respostas.
- Publicação do aplicativo segue o procedimento do projeto e os checks do commit exato; confirme sucesso terminal, versão e saúde antes de declarar produção concluída. Orientações são publicadas pelo repositório; não force redeploy do aplicativo só para fechar documentação.

## Documentação e entrega

Adicione a entrada nova no topo de docs/historico.md com data, mudança e motivo. Atualize docs/arquitetura.md quando mudar estrutura, abstração, provedor ou decisão; docs/contexto.md quando mudar o que está pronto, pendente ou mockado. Documentação pertinente acompanha o mesmo commit da mudança de código.

Atualize uma vez e no lugar certo. Não modifique documentos sem mudança material só para cumprir uma lista. Preserve registros anteriores e resolva divergências pelo código, testes e decisão vigente.

No fechamento, informe resultado, validação e pendências reais. Ao concluir cada feature, apresente três sugestões curtas, nesta ordem: **UX**, **layout** e **código**, com problema ou risco concreto, benefício e esforço. Se não houver sugestão útil em uma categoria, diga isso sem inventar problema. As sugestões aguardam a decisão de Bruno; não execute sem autorização nem reabra a entrega concluída por causa delas.
