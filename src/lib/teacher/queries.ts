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
  users,
} from "@/lib/db/schema";
import { ensureNetworkSeeded } from "@/lib/db/seed-network";
import { ALUNOS_7A, HABILIDADES_BNCC } from "@/lib/mocks";

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

const DEMO_TENANT_ID = "alfenas";
const DEMO_TEACHER_ID = "u-ricardo";
const DEMO_SCHOOL_ID = "school-demo-alfenas";
const DEMO_CLASS_ID = "class-demo-7a";

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
    const d = db();
    let rows = await d
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

    if (rows.length === 0 && isDemoTeacher(input)) {
      await repairDemoTeacherScope();
      rows = await d
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

      if (rows.length === 0) return demoTeacherContext();
    }

    return { classes: rows, classIds: rows.map((r) => r.id) };
  } catch (err) {
    console.error("[teacher/queries] loadTeacherContext failed:", err);
    if (isDemoTeacher(input)) return demoTeacherContext();
    return { classes: [], classIds: [] };
  }
}

function isDemoTeacher(input: { userId: string; tenantId: string }): boolean {
  return input.userId === DEMO_TEACHER_ID && input.tenantId === DEMO_TENANT_ID;
}

function demoTeacherContext(): TeacherContext {
  return {
    classes: [
      {
        id: DEMO_CLASS_ID,
        name: "7º A",
        grade: "7",
        schoolName: "EM Padre Eustáquio",
      },
    ],
    classIds: [DEMO_CLASS_ID],
  };
}

async function repairDemoTeacherScope(): Promise<void> {
  const d = db();

  await d
    .insert(schools)
    .values({
      id: DEMO_SCHOOL_ID,
      tenantId: DEMO_TENANT_ID,
      name: "EM Padre Eustáquio",
    })
    .onConflictDoNothing();

  await d
    .insert(classes)
    .values({
      id: DEMO_CLASS_ID,
      tenantId: DEMO_TENANT_ID,
      schoolId: DEMO_SCHOOL_ID,
      name: "7º A",
      grade: "7",
      year: new Date().getFullYear(),
    })
    .onConflictDoNothing();

  await d
    .insert(users)
    .values({
      id: DEMO_TEACHER_ID,
      email: "ricardo@alfenas.demo",
      name: "Ricardo Marques",
    })
    .onConflictDoNothing();

  await d
    .insert(memberships)
    .values({
      id: `mem-${DEMO_TEACHER_ID}`,
      userId: DEMO_TEACHER_ID,
      tenantId: DEMO_TENANT_ID,
      role: "professor",
      schoolId: DEMO_SCHOOL_ID,
      classId: DEMO_CLASS_ID,
    })
    .onConflictDoNothing();

  await d
    .update(memberships)
    .set({
      schoolId: DEMO_SCHOOL_ID,
      classId: DEMO_CLASS_ID,
    })
    .where(
      and(
        eq(memberships.userId, DEMO_TEACHER_ID),
        eq(memberships.tenantId, DEMO_TENANT_ID),
        eq(memberships.role, "professor"),
      ),
    );
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
    if (hasDemoClass(input)) return demoDashboardKpis();
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

    const result = {
      studentsTotal: totalRow?.n ?? 0,
      engagedThisWeek: engagedRows.length,
      atRisk: {
        count: riskRows.length,
        names: riskRows.map((r) => r.fullName.split(" ").slice(0, 2).join(" ")),
      },
    };
    if (result.studentsTotal === 0 && hasDemoClass(input)) {
      return demoDashboardKpis();
    }
    return result;
  } catch (err) {
    console.error("[teacher/queries] loadDashboardKpis failed:", err);
    if (hasDemoClass(input)) return demoDashboardKpis();
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
  if (!dbAvailable() || input.classIds.length === 0) {
    if (hasDemoClass(input)) return demoTopStudents(input.limit);
    return [];
  }
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
    if (rows.length === 0 && hasDemoClass(input)) {
      return demoTopStudents(input.limit);
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      initials: initialsOf(r.name),
      avgScore: r.avgScore,
    }));
  } catch (err) {
    console.error("[teacher/queries] loadTopStudents failed:", err);
    if (hasDemoClass(input)) return demoTopStudents(input.limit);
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

export interface HeatmapCell {
  habilityCode: string;
  score: number;
}

export interface HeatmapRow {
  studentId: string;
  studentName: string;
  cells: HeatmapCell[];
}

export interface ClassHeatmap {
  habilities: Array<{ code: string; area: string; description: string }>;
  rows: HeatmapRow[];
}

export async function loadClassHeatmap(input: {
  tenantId: string;
  classId: string;
}): Promise<ClassHeatmap> {
  if (!dbAvailable()) {
    if (isDemoClass(input)) return demoClassHeatmap();
    return { habilities: [], rows: [] };
  }
  try {
    const d = db();

    const habsRows = await d
      .selectDistinct({
        code: studentProficiency.habilityCode,
      })
      .from(studentProficiency)
      .innerJoin(students, eq(students.id, studentProficiency.studentId))
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          eq(students.classId, input.classId),
        ),
      );

    if (habsRows.length === 0) {
      if (isDemoClass(input)) return demoClassHeatmap();
      return { habilities: [], rows: [] };
    }

    const habCodes = habsRows.map((h) => h.code);

    const { habilities: habilitiesTable } = await import("@/lib/db/schema");
    const habInfo = await d
      .select({
        code: habilitiesTable.code,
        area: habilitiesTable.area,
        description: habilitiesTable.description,
      })
      .from(habilitiesTable)
      .where(inArray(habilitiesTable.code, habCodes));

    const studentsRows = await d
      .select({ id: students.id, name: students.fullName })
      .from(students)
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          eq(students.classId, input.classId),
        ),
      );

    const profRows = await d
      .select({
        studentId: studentProficiency.studentId,
        habilityCode: studentProficiency.habilityCode,
        score: studentProficiency.score,
      })
      .from(studentProficiency)
      .innerJoin(students, eq(students.id, studentProficiency.studentId))
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          eq(students.classId, input.classId),
        ),
      );

    const byStudent = new Map<string, Map<string, number>>();
    for (const r of profRows) {
      let m = byStudent.get(r.studentId);
      if (!m) {
        m = new Map();
        byStudent.set(r.studentId, m);
      }
      m.set(r.habilityCode, r.score);
    }

    const rows: HeatmapRow[] = studentsRows.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      cells: habCodes.map((h) => ({
        habilityCode: h,
        score: byStudent.get(s.id)?.get(h) ?? 0,
      })),
    }));

    return { habilities: habInfo, rows };
  } catch (err) {
    console.error("[teacher/queries] loadClassHeatmap failed:", err);
    if (isDemoClass(input)) return demoClassHeatmap();
    return { habilities: [], rows: [] };
  }
}

export interface RosterEntry {
  studentId: string;
  fullName: string;
  initials: string;
  avgScore: number;
  proficiency: "avancada" | "adequada" | "basica" | "insuficiente";
  conversationCount: number;
  lastActivity: Date | null;
}

export async function loadClassRoster(input: {
  tenantId: string;
  classId: string;
}): Promise<RosterEntry[]> {
  if (!dbAvailable()) {
    if (isDemoClass(input)) return demoClassRoster();
    return [];
  }
  try {
    const d = db();

    const baseRows = await d
      .select({
        id: students.id,
        fullName: students.fullName,
        avgScore: sql<number>`coalesce(avg(${studentProficiency.score}), 0)`,
      })
      .from(students)
      .leftJoin(
        studentProficiency,
        eq(studentProficiency.studentId, students.id),
      )
      .where(
        and(
          eq(students.tenantId, input.tenantId),
          eq(students.classId, input.classId),
        ),
      )
      .groupBy(students.id, students.fullName);

    const activityRows = await d
      .select({
        studentId: conversations.studentId,
        count: count(),
        lastActivity: sql<Date>`max(${conversations.updatedAt})`,
      })
      .from(conversations)
      .innerJoin(students, eq(students.id, conversations.studentId))
      .where(
        and(
          eq(conversations.tenantId, input.tenantId),
          eq(students.classId, input.classId),
        ),
      )
      .groupBy(conversations.studentId);

    const activityMap = new Map(
      activityRows.map((r) => [r.studentId, r] as const),
    );

    if (baseRows.length === 0 && isDemoClass(input)) {
      return demoClassRoster();
    }

    return baseRows
      .map((r) => {
        const a = activityMap.get(r.id);
        return {
          studentId: r.id,
          fullName: r.fullName,
          initials: initialsOf(r.fullName),
          avgScore: r.avgScore,
          proficiency: scoreToProficiency(r.avgScore),
          conversationCount: a?.count ?? 0,
          lastActivity: a?.lastActivity ?? null,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  } catch (err) {
    console.error("[teacher/queries] loadClassRoster failed:", err);
    if (isDemoClass(input)) return demoClassRoster();
    return [];
  }
}

function isDemoClass(input: { tenantId: string; classId: string }): boolean {
  return input.tenantId === DEMO_TENANT_ID && input.classId === DEMO_CLASS_ID;
}

function hasDemoClass(input: { tenantId: string; classIds: string[] }): boolean {
  return (
    input.tenantId === DEMO_TENANT_ID && input.classIds.includes(DEMO_CLASS_ID)
  );
}

function demoDashboardKpis(): TeacherKpis {
  const atRisk = ALUNOS_7A.filter((a) => a.risco);
  return {
    studentsTotal: ALUNOS_7A.length,
    engagedThisWeek: ALUNOS_7A.filter((a) => a.acessos > 0).length,
    atRisk: {
      count: atRisk.length,
      names: atRisk.map((a) => a.nome.split(" ").slice(0, 2).join(" ")),
    },
  };
}

function demoTopStudents(limit = 3): TopStudent[] {
  return demoClassRoster()
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit)
    .map((student) => ({
      id: student.studentId,
      name: student.fullName,
      initials: student.initials,
      avgScore: student.avgScore,
    }));
}

function demoClassHeatmap(): ClassHeatmap {
  return {
    habilities: HABILIDADES_BNCC.map((h) => ({
      code: h.codigo,
      area: h.area,
      description: h.desc,
    })),
    rows: ALUNOS_7A.map((student) => ({
      studentId: demoStudentId(student.id),
      studentName: student.nome,
      cells: HABILIDADES_BNCC.map((h, i) => ({
        habilityCode: h.codigo,
        score: demoScoreFor(student.prof, i),
      })),
    })),
  };
}

function demoClassRoster(): RosterEntry[] {
  return ALUNOS_7A.map((student, i) => {
    const avgScore = demoScoreFor(student.prof, i);
    return {
      studentId: demoStudentId(student.id),
      fullName: student.nome,
      initials: initialsOf(student.nome),
      avgScore,
      proficiency: scoreToProficiency(avgScore),
      conversationCount: student.acessos,
      lastActivity: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
    };
  }).sort((a, b) => b.avgScore - a.avgScore);
}

function demoStudentId(id: string): string {
  return id === "a1" ? "student-joao" : `student-${id}`;
}

function demoScoreFor(
  base: "avancada" | "adequada" | "basica" | "insuficiente",
  i: number,
): number {
  const baseScore =
    base === "avancada"
      ? 0.88
      : base === "adequada"
        ? 0.7
        : base === "basica"
          ? 0.5
          : 0.3;
  const jitter = ((i * 7) % 13) / 100 - 0.06;
  return Number(Math.max(0.05, Math.min(0.98, baseScore + jitter)).toFixed(2));
}
