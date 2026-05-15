/**
 * Queries do contexto do Professor (server-only).
 *
 * Tudo graceful: sem `DATABASE_URL` ou queries falhando, devolvem
 * resultados vazios em vez de propagar erro — telas caem pra empty state
 * em vez de explodir.
 *
 * `ensureNetworkSeeded()` é chamado nas funções de entrada pra garantir
 * que o demo (Alfenas 7º A) está populado mesmo que ninguém tenha aberto
 * outra tela ainda.
 */

import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  conversations,
  memberships,
  schools,
  studentProficiency,
  students,
} from "@/lib/db/schema";
import { ensureNetworkSeeded } from "@/lib/db/seed-network";

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

export interface TeacherContext {
  classes: Array<{ id: string; name: string; grade: string; schoolName: string }>;
  classIds: string[];
}

export async function loadTeacherContext(input: {
  userId: string;
  tenantId: string;
}): Promise<TeacherContext> {
  if (!dbAvailable()) return { classes: [], classIds: [] };
  try {
    await ensureNetworkSeeded();
    const rows = await db()
      .select({
        id: classes.id,
        name: classes.name,
        grade: classes.grade,
        schoolName: schools.name,
      })
      .from(memberships)
      .innerJoin(classes, eq(classes.id, memberships.classId))
      .innerJoin(schools, eq(schools.id, classes.schoolId))
      .where(
        and(
          eq(memberships.userId, input.userId),
          eq(memberships.tenantId, input.tenantId),
        ),
      );
    return { classes: rows, classIds: rows.map((r) => r.id) };
  } catch (err) {
    console.error("[teacher/queries] loadTeacherContext failed:", err);
    return { classes: [], classIds: [] };
  }
}

export interface TeacherKpis {
  studentsTotal: number;
  engagedThisWeek: number;
  atRisk: { count: number; names: string[] };
}

export async function loadDashboardKpis(input: {
  tenantId: string;
  classIds: string[];
}): Promise<TeacherKpis> {
  if (!dbAvailable() || input.classIds.length === 0) {
    return { studentsTotal: 0, engagedThisWeek: 0, atRisk: { count: 0, names: [] } };
  }
  try {
    const d = db();
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [totalRow] = await d
      .select({ n: count() })
      .from(students)
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          inArray(students.classId, input.classIds),
        ),
      );

    const engagedRows = await d
      .selectDistinct({ studentId: conversations.studentId })
      .from(conversations)
      .innerJoin(students, eq(students.id, conversations.studentId))
      .where(
        and(
          eq(conversations.tenantId, input.tenantId),
          inArray(students.classId, input.classIds),
          gte(conversations.updatedAt, since),
        ),
      );

    const riskRows = await d
      .select({
        studentId: students.id,
        fullName: students.fullName,
        avgScore: sql<number>`avg(${studentProficiency.score})`,
      })
      .from(students)
      .leftJoin(
        studentProficiency,
        eq(studentProficiency.studentId, students.id),
      )
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          inArray(students.classId, input.classIds),
        ),
      )
      .groupBy(students.id, students.fullName)
      .having(sql`avg(${studentProficiency.score}) < 0.45`)
      .orderBy(sql`avg(${studentProficiency.score}) asc`)
      .limit(5);

    return {
      studentsTotal: totalRow?.n ?? 0,
      engagedThisWeek: engagedRows.length,
      atRisk: {
        count: riskRows.length,
        names: riskRows.map((r) => r.fullName.split(" ").slice(0, 2).join(" ")),
      },
    };
  } catch (err) {
    console.error("[teacher/queries] loadDashboardKpis failed:", err);
    return { studentsTotal: 0, engagedThisWeek: 0, atRisk: { count: 0, names: [] } };
  }
}

export interface TopStudent {
  id: string;
  name: string;
  initials: string;
  avgScore: number;
}

export async function loadTopStudents(input: {
  tenantId: string;
  classIds: string[];
  limit?: number;
}): Promise<TopStudent[]> {
  if (!dbAvailable() || input.classIds.length === 0) return [];
  try {
    const rows = await db()
      .select({
        id: students.id,
        name: students.fullName,
        avgScore: sql<number>`avg(${studentProficiency.score})`,
      })
      .from(students)
      .innerJoin(
        studentProficiency,
        eq(studentProficiency.studentId, students.id),
      )
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          inArray(students.classId, input.classIds),
        ),
      )
      .groupBy(students.id, students.fullName)
      .orderBy(desc(sql`avg(${studentProficiency.score})`))
      .limit(input.limit ?? 3);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      initials: initialsOf(r.name),
      avgScore: r.avgScore,
    }));
  } catch (err) {
    console.error("[teacher/queries] loadTopStudents failed:", err);
    return [];
  }
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function scoreToProficiency(
  score: number,
): "avancada" | "adequada" | "basica" | "insuficiente" {
  if (score >= 0.8) return "avancada";
  if (score >= 0.6) return "adequada";
  if (score >= 0.4) return "basica";
  return "insuficiente";
}
