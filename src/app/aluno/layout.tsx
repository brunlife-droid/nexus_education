import type { Metadata } from "next";
import { AlunoSidebar } from "@/components/shell";
import { getCurrentTenant } from "@/lib/tenants/server";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Aluno · Nexus Education",
  robots: { index: false, follow: false },
};

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("aluno", "responsavel");
  const tenant = await getCurrentTenant();
  return (
    <div className="bg-canvas grid h-screen grid-cols-[280px_1fr] overflow-hidden">
      <AlunoSidebar tenant={tenant} studentName={user.name ?? "Aluno"} />
      <main className="flex min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
