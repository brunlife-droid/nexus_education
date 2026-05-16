"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

interface LogoutButtonProps {
  compact?: boolean;
}

export function LogoutButton({ compact = false }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut({ callbackUrl: "/entrar", redirect: false });
      window.location.assign("/entrar");
    } catch {
      setLoading(false);
    }
  }

  const Icon = loading ? Loader2 : LogOut;

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Sair da conta"
      className={cn(
        "text-text-muted hover:bg-danger-soft hover:text-danger-fg flex w-full items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
        compact && "justify-center px-2",
      )}
    >
      <Icon size={14} className={cn("shrink-0", loading && "animate-spin")} />
      {!compact && <span>Sair</span>}
    </button>
  );
}
