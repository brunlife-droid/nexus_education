import { Mic, Plus } from "lucide-react";
import type { Tenant } from "@/lib/tenants";
import { cn } from "@/lib/cn";

interface ChatInputProps {
  tenant: Tenant;
  disabled?: boolean;
}

export function ChatInput({ tenant, disabled }: ChatInputProps) {
  return (
    <div
      className={cn(
        "bg-surface border-border flex items-center gap-2 border-t px-3 pt-2.5 pb-4",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        className="bg-surface-2 text-text-muted flex size-[38px] shrink-0 items-center justify-center rounded-full"
      >
        <Plus size={18} />
      </button>
      <div className="bg-surface-2 text-text-faint flex h-[38px] flex-1 items-center rounded-full px-3.5 text-sm">
        Pergunte alguma coisa…
      </div>
      <button
        type="button"
        className="flex size-[38px] shrink-0 items-center justify-center rounded-full"
        style={{ background: tenant.primary, color: tenant.primaryFg }}
      >
        <Mic size={18} />
      </button>
    </div>
  );
}
