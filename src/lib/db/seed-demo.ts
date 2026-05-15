/**
 * Seed idempotente para o usuário aluno demo (u-joao).
 *
 * `students.studentId` é FK obrigatória em `conversations`. Como ainda não
 * temos onboarding real, garantimos via código que existe uma escola, uma
 * turma e uma row em `students` ligada ao demo user `u-joao` no tenant
 * `alfenas`. Tudo idempotente — pode ser chamado em todo request.
 *
 * Se DATABASE_URL não estiver configurada, retorna null silenciosamente
 * (chat continua funcionando sem persistência).
 */

import { eq } from "drizzle-orm";
import { db } from "./client";
import { schools, classes, students, users } from "./schema";

const DEMO = {
  tenantId: "alfenas",
  userId: "u-joao",
  userEmail: "joao@alfenas.demo",
  userName: "João Pedro Silva",
  schoolId: "school-demo-alfenas",
  schoolName: "EM Padre Eustáquio",
  classId: "class-demo-7a",
  className: "7º A",
  classGrade: "7",
  studentId: "student-joao",
} as const;

export async function ensureDemoStudent(): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const d = db();

    const existing = await d
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, DEMO.studentId))
      .limit(1);
    if (existing.length > 0) return existing[0]!.id;

    await d
      .insert(users)
      .values({
        id: DEMO.userId,
        email: DEMO.userEmail,
        name: DEMO.userName,
      })
      .onConflictDoNothing();

    await d
      .insert(schools)
      .values({
        id: DEMO.schoolId,
        tenantId: DEMO.tenantId,
        name: DEMO.schoolName,
      })
      .onConflictDoNothing();

    await d
      .insert(classes)
      .values({
        id: DEMO.classId,
        tenantId: DEMO.tenantId,
        schoolId: DEMO.schoolId,
        name: DEMO.className,
        grade: DEMO.classGrade,
        year: new Date().getFullYear(),
      })
      .onConflictDoNothing();

    await d
      .insert(students)
      .values({
        id: DEMO.studentId,
        tenantId: DEMO.tenantId,
        userId: DEMO.userId,
        schoolId: DEMO.schoolId,
        classId: DEMO.classId,
        fullName: DEMO.userName,
      })
      .onConflictDoNothing();

    return DEMO.studentId;
  } catch (err) {
    console.error("[seed-demo] failed:", err);
    return null;
  }
}

export const DEMO_STUDENT_ID = DEMO.studentId;
