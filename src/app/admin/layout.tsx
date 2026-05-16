import type { Metadata } from "next";
import { Sidebar, Topbar } from "@/components/shell";
import { getCurrentTenant } from "@/lib/tenants/server";
import { requireRole } from "@/lib/auth/session";
import { getRoleLabel } from "@/lib/auth/session-paths";

export const metadata: Metadata = {
  title: "Admin · Nexus Education",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin_nexus");
  const tenant = await getCurrentTenant();
  return (
    <div className="bg-canvas grid h-screen grid-cols-[260px_1fr] overflow-hidden">
      <Sidebar
        layer="admin"
        tenant={tenant}
        userName={user.name ?? "Admin Nexus"}
        userRole={getRoleLabel(user.role)}
      />
      <main className="scroll-thin flex min-h-0 flex-col overflow-auto">
        <Topbar layer="admin" userName={user.name ?? "Admin Nexus"} />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
