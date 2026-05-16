#!/usr/bin/env bash
# SessionStart hook · Nexus Education
#
# Injeta os docs vivos (contexto, arquitetura, histórico) no contexto da
# sessão automaticamente, pra que nenhum Claude que abrir esse repo
# precise "lembrar" de ler os arquivos. CLAUDE.md já manda ler, esse
# hook é a barreira de cinto que GARANTE que está no contexto.
#
# Saída: JSON com hookSpecificOutput.additionalContext (texto injetado
# como mensagem de sistema no início da sessão).

set -euo pipefail
cd "$(dirname "$0")/../.."

jq -nR \
  --rawfile contexto docs/contexto.md \
  --rawfile arq docs/arquitetura.md \
  --rawfile hist docs/historico.md \
  '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: (
        "📚 Docs vivos do Nexus Education (injetados pelo SessionStart hook)\n\n" +
        "Esses três arquivos são a memória do projeto entre sessões. Leia-os ANTES de codar; atualize-os DEPOIS de codar. O workflow completo está em CLAUDE.md.\n\n" +
        "=== docs/contexto.md ===\n" + $contexto +
        "\n\n=== docs/arquitetura.md ===\n" + $arq +
        "\n\n=== docs/historico.md ===\n" + $hist +
        "\n\n⚠️ LEMBRETE OPERACIONAL: depois de qualquer mudança de código nesse repo, adicione entrada nova no TOPO de docs/historico.md (data + o que mudou + por quê) e atualize docs/contexto.md e docs/arquitetura.md se aplicável. Sair sem atualizar quebra a memória do projeto."
      )
    }
  }'
