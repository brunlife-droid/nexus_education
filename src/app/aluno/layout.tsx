import type { Metadata } from "next";
import { Sidebar, Topbar } from "@/components/shell";
import { getCurrentTenant } from "@/lib/tenants/server";

export const metadata: Metadata = {
  title: "Aluno · Nexus Education",
  robots: { index: false, follow: false },
};

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();
  return (
    <div className="bg-canvas grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <Sidebar layer="aluno" tenant={tenant} />
      <main className="scroll-thin flex min-h-0 flex-col overflow-auto">
        <Topbar layer="aluno" />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
