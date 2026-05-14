import { ChevronLeft, MoreVertical } from "lucide-react";
import type { Tenant } from "@/lib/tenants";

export function ChatHeader({ tenant }: { tenant: Tenant }) {
  return (
    <div className="bg-surface border-border flex h-[60px] shrink-0 items-center gap-3 border-b px-4">
      <ChevronLeft size={20} strokeWidth={2} className="text-text-muted" />
      <div
        className="relative flex size-9 items-center justify-center rounded-full text-base font-semibold"
        style={{
          background: tenant.primarySoft,
          color: tenant.primary,
          fontFamily: "var(--font-serif)",
        }}
      >
        {tenant.tutorName[0]}
        <div className="bg-success border-surface absolute -right-px -bottom-px size-2.5 rounded-full border-2" />
      </div>
      <div className="flex-1 leading-tight">
        <div className="text-[14px] font-semibold">{tenant.tutorName}</div>
        <div className="text-text-muted text-[11px]">
          tutora da {tenant.short.toLowerCase()}
        </div>
      </div>
      <MoreVertical size={18} className="text-text-muted" />
    </div>
  );
}
