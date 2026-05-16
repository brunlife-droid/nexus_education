import type { Metadata } from "next";
import { Sidebar, Topbar } from "@/components/shell";
import { getCurrentTenant } from "@/lib/tenants/server";
import { requireRole } from "@/lib/auth/session";
import { getRoleLabel } from "@/lib/auth/session-paths";

export const metadata: Metadata = {
  title: "Secretaria · Nexus Education",
  robots: { index: false, follow: false },
};

export default async function SecretariaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("secretaria");
  const tenant = await getCurrentTenant();
  return (
    <div className="bg-canvas grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <Sidebar
        layer="secretaria"
        tenant={tenant}
        userName={user.name ?? "Secretaria"}
        userRole={getRoleLabel(user.role)}
      />
      <main className="scroll-thin flex min-h-0 flex-col overflow-auto">
        <Topbar layer="secretaria" userName={user.name ?? "Secretaria"} />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
