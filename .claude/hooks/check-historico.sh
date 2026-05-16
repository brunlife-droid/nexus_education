#!/usr/bin/env bash
# Stop hook · Nexus Education
#
# Verifica se houve mudança em código (src/, drizzle/migrations/,
# package.json) sem entrada nova em docs/historico.md. Se sim, bloqueia
# a parada do agente pra forçar a atualização do histórico.
#
# Saída:
#   - Nada (exit 0): deixa o agente parar normalmente.
#   - {"decision":"block","reason":"..."}: força o agente a continuar e
#     resolver. Modelo recebe o reason como feedback.
#
# Como detecta:
#   - `git diff HEAD` (working tree) + `git diff --cached` (staged) =
#     tudo que não está commitado.
#   - Se NÃO há código modificado, não bloqueia (turno foi conversa só).
#   - Se há código modificado E historico.md está limpo, bloqueia.
#   - Se há código modificado E historico.md também modificado, deixa
#     passar (provavelmente foi atualizado nessa mesma sessão).

set -euo pipefail
cd "$(dirname "$0")/../.."

# Junta working tree + staged, deduplica.
CHANGED=$( {
  git diff --name-only HEAD 2>/dev/null || true
  git diff --name-only --cached 2>/dev/null || true
} | sort -u )

# Pastas/arquivos considerados "código" pra fim de gatilho.
CODE_CHANGED=$(echo "$CHANGED" | grep -E '^(src/|drizzle/migrations/|package\.json|package-lock\.json)' | head -1 || true)
HIST_CHANGED=$(echo "$CHANGED" | grep -c '^docs/historico\.md$' || true)

if [ -n "$CODE_CHANGED" ] && [ "$HIST_CHANGED" -eq 0 ]; then
  jq -n '{
    decision: "block",
    reason: "⚠️ Você editou código mas não atualizou docs/historico.md. Antes de encerrar essa sessão, adicione uma entrada NOVA NO TOPO de docs/historico.md descrevendo: data, o que mudou, e por quê. Se aplicável, atualize também docs/arquitetura.md (mudanças estruturais) e docs/contexto.md (estado do projeto). Esses docs são a memória entre sessões — pular essa etapa quebra trabalho futuro. Workflow completo em CLAUDE.md."
  }'
fi
