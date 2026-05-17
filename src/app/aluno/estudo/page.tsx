import { requireRole } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/tenants/server";
import { resolveStudentId } from "@/lib/db/student-resolver";
import { loadStudentArtifacts } from "@/lib/student/artifacts";
import { StudyArtifactsClient } from "./study-artifacts-client";

interface PageProps {
  searchParams: Promise<{ conversationId?: string }>;
}

export default async function EstudoPage({ searchParams }: PageProps) {
  const user = await requireRole("aluno", "responsavel");
  const tenant = await getCurrentTenant();
  const params = await searchParams;
  const studentId = await resolveStudentId({
    userId: user.id,
    tenantId: tenant.id,
  });
  const artifacts = await loadStudentArtifacts({
    tenantId: tenant.id,
    actorUserId: user.id,
    studentId,
  });

  return (
    <StudyArtifactsClient
      tenant={{
        primary: tenant.primary,
        primaryFg: tenant.primaryFg,
        primarySoft: tenant.primarySoft,
        secondary: tenant.secondary,
        short: tenant.short,
        tutorName: tenant.tutorName,
      }}
      conversationId={params.conversationId ?? null}
      initialArtifacts={artifacts.map((artifact) => ({
        ...artifact,
        createdAt: artifact.createdAt.toISOString(),
      }))}
    />
  );
}
