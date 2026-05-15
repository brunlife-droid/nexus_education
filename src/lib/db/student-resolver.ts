/**
 * Resolve o `studentId` do usuário aluno logado.
 *
 * - Se o user é o demo `u-joao`, garante o seed antes (school/class/student).
 * - Caso contrário, faz lookup em `students` (userId + tenantId).
 * - Sem `DATABASE_URL` ou se nada bater, retorna null — chamadores precisam
 *   tratar como "modo efêmero" (chat funciona, mas não persiste).
 */

import { and, eq } from "drizzle-orm";
import { db } from "./client";
import { students } from "./schema";
import { ensureDemoStudent } from "./seed-demo";

const DEMO_USER_ID = "u-joao";

export async function resolveStudentId(input: {
  userId: string;
  tenantId: string;
}): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;

  if (input.userId === DEMO_USER_ID) {
    return ensureDemoStudent();
  }

  try {
    const rows = await db()
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.userId, input.userId),
          eq(students.tenantId, input.tenantId),
        ),
      )
      .limit(1);
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error("[student-resolver] failed:", err);
    return null;
  }
}
