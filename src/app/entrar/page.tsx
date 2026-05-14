import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { getCurrentTenant } from "@/lib/tenants/server";
import { PrefLogo } from "@/components/tenant";
import { DEMO_USERS } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Entrar · Nexus Education",
  robots: { index: false, follow: false },
};

interface SearchParams {
  callbackUrl?: string;
  error?: string;
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const tenant = await getCurrentTenant();
  const params = await searchParams;

  return (
    <div className="bg-canvas flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex justify-center">
          <PrefLogo tenant={tenant} size={40} />
        </div>

        <div className="bg-surface border-border rounded-2xl border p-8 shadow-[var(--shadow-md)]">
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-text-muted mt-1.5 text-sm">
            Acesse a plataforma da {tenant.short}.
          </p>

          <LoginForm
            callbackUrl={params.callbackUrl}
            error={params.error}
          />
        </div>

        {/* Credenciais de demo (Fase 0) */}
        <details className="border-border bg-surface mt-6 rounded-lg border p-4">
          <summary className="text-text-muted cursor-pointer text-xs font-medium">
            Contas de demonstração (Fase 0)
          </summary>
          <div className="mt-3 flex flex-col gap-2 text-[11.5px]">
            {DEMO_USERS.map((u) => (
              <div
                key={u.id}
                className="bg-surface-2 flex flex-col gap-0.5 rounded-md p-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span>
                  <b>{u.role}</b> · {u.email}
                </span>
                <span className="text-text-faint">senha: {u.password}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
