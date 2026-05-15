/**
 * Queries do contexto da Secretaria (visão da rede inteira no tenant).
 *
 * Tudo graceful: sem `DATABASE_URL`, devolve resultados vazios em vez de
 * propagar erro. `ensureNetworkSeeded()` chamado nos entry points pra
 * garantir dado demo.
 */

import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
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

export interface NetworkKpis {
  studentsTotal: number;
  studentsEngaged7d: number;
  teachersTotal: number;
  schoolsTotal: number;
  classesTotal: number;
  studentsAtRisk: number;
  avgProficiency: number;
}

export async function loadNetworkKpis(input: {
  tenantId: string;
}): Promise<NetworkKpis> {
  if (!dbAvailable()) {
    return {
      studentsTotal: 0,
      studentsEngaged7d: 0,
      teachersTotal: 0,
      schoolsTotal: 0,
      classesTotal: 0,
      studentsAtRisk: 0,
      avgProficiency: 0,
    };
  }
  try {
    await ensureNetworkSeeded();
    const d = db();
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [studentsRow] = await d
      .select({ n: count() })
      .from(students)
      .where(eq(students.tenantId, input.tenantId));

    const [schoolsRow] = await d
      .select({ n: count() })
      .from(schools)
      .where(eq(schools.tenantId, input.tenantId));

    const [classesRow] = await d
      .select({ n: count() })
      .from(classes)
      .where(eq(classes.tenantId, input.tenantId));

    const [teachersRow] = await d
      .select({ n: count() })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, input.tenantId),
          inArray(memberships.role, [
            "professor",
            "coordenador",
            "diretor",
            "orientador",
          ]),
        ),
      );

    const engagedRows = await d
      .selectDistinct({ studentId: conversations.studentId })
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, input.tenantId),
          gte(conversations.updatedAt, since),
        ),
      );

    const riskRows = await d
      .select({
        studentId: students.id,
      })
      .from(students)
      .leftJoin(
        studentProficiency,
        eq(studentProficiency.studentId, students.id),
      )
      .where(eq(students.tenantId, input.tenantId))
      .groupBy(students.id)
      .having(sql`avg(${studentProficiency.score}) < 0.45`);

    const [avgRow] = await d
      .select({
        avg: sql<number>`coalesce(avg(${studentProficiency.score}), 0)`,
      })
      .from(studentProficiency)
      .where(eq(studentProficiency.tenantId, input.tenantId));

    return {
      studentsTotal: studentsRow?.n ?? 0,
      studentsEngaged7d: engagedRows.length,
      teachersTotal: teachersRow?.n ?? 0,
      schoolsTotal: schoolsRow?.n ?? 0,
      classesTotal: classesRow?.n ?? 0,
      studentsAtRisk: riskRows.length,
      avgProficiency: avgRow?.avg ?? 0,
    };
  } catch (err) {
    console.error("[secretaria/queries] loadNetworkKpis failed:", err);
    return {
      studentsTotal: 0,
      studentsEngaged7d: 0,
      teachersTotal: 0,
      schoolsTotal: 0,
      classesTotal: 0,
      studentsAtRisk: 0,
      avgProficiency: 0,
    };
  }
}

export interface SchoolHealth {
  id: string;
  name: string;
  studentsTotal: number;
  classesTotal: number;
  avgProficiency: number;
  atRiskCount: number;
}

export async function loadSchoolsHealth(input: {
  tenantId: string;
}): Promise<SchoolHealth[]> {
  if (!dbAvailable()) return [];
  try {
    const d = db();

    const rows = await d
      .select({
        id: schools.id,
        name: schools.name,
        studentsTotal: sql<number>`count(distinct ${students.id})`,
        classesTotal: sql<number>`count(distinct ${classes.id})`,
        avgProficiency: sql<number>`coalesce(avg(${studentProficiency.score}), 0)`,
      })
      .from(schools)
      .leftJoin(students, eq(students.schoolId, schools.id))
      .leftJoin(classes, eq(classes.schoolId, schools.id))
      .leftJoin(
        studentProficiency,
        eq(studentProficiency.studentId, students.id),
      )
      .where(eq(schools.tenantId, input.tenantId))
      .groupBy(schools.id, schools.name);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      studentsTotal: Number(r.studentsTotal),
      classesTotal: Number(r.classesTotal),
      avgProficiency: r.avgProficiency,
      atRiskCount: 0,
    }));
  } catch (err) {
    console.error("[secretaria/queries] loadSchoolsHealth failed:", err);
    return [];
  }
}
