import type { Metadata } from "next";
import { Sidebar, Topbar } from "@/components/shell";
import { getCurrentTenant } from "@/lib/tenants/server";
import { requireRole } from "@/lib/auth/session";
import { getRoleLabel } from "@/lib/auth/session-paths";

export const metadata: Metadata = {
  title: "Professor · Nexus Education",
  robots: { index: false, follow: false },
};

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(
    "professor",
    "coordenador",
    "diretor",
    "orientador",
  );
  const tenant = await getCurrentTenant();
  return (
    <div className="bg-canvas grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <Sidebar
        layer="professor"
        tenant={tenant}
        userName={user.name ?? "Professor"}
        userRole={getRoleLabel(user.role)}
      />
      <main className="scroll-thin flex min-h-0 flex-col overflow-auto">
        <Topbar layer="professor" userName={user.name ?? "Professor"} />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
