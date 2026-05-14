"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

interface LoginFormProps {
  callbackUrl?: string;
  error?: string;
}

export function LoginForm({ callbackUrl, error: initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError("E-mail ou senha incorretos.");
        return;
      }
      router.push(callbackUrl ?? "/");
      router.refresh();
    } catch {
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="text-text-muted block text-xs font-medium"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-surface border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none transition-all"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="text-text-muted block text-xs font-medium"
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-surface border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] mt-1 h-10 w-full rounded-md border px-3 text-sm outline-none transition-all"
        />
      </div>

      {error && (
        <div className="bg-danger-soft text-danger-fg flex items-start gap-2 rounded-md p-3 text-xs">
          <AlertCircle size={14} className="mt-px shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={loading} className="mt-2 w-full justify-center">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
