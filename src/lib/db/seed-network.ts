/**
 * Seed da rede demo (Alfenas): users + memberships dos demo non-students,
 * 12 alunos do 7º A, 9 habilidades BNCC, proficiência por aluno×habilidade.
 *
 * Idempotente — pode ser chamado em todo request. Cacheado por instância de
 * processo via flag em memória pra evitar query inútil em request quente.
 *
 * Se DATABASE_URL não estiver configurada, retorna silenciosamente.
 */

import { and, eq } from "drizzle-orm";
import { db } from "./client";
import {
  classes,
  habilities,
  memberships,
  schools,
  studentProficiency,
  students,
  users,
} from "./schema";
import { ALUNOS_7A, HABILIDADES_BNCC } from "@/lib/mocks";

const TENANT_ID = "alfenas";
const SCHOOL_ID = "school-demo-alfenas";
const CLASS_ID = "class-demo-7a";

const DEMO_NON_STUDENTS = [
  {
    id: "u-ricardo",
    email: "ricardo@alfenas.demo",
    name: "Ricardo Marques",
    role: "professor" as const,
    classId: CLASS_ID,
  },
  {
    id: "u-claudia",
    email: "claudia@alfenas.demo",
    name: "Cláudia Resende",
    role: "secretaria" as const,
    classId: null,
  },
  {
    id: "u-bruno",
    email: "bruno@nexus.education",
    name: "Bruno Andrade",
    role: "admin_nexus" as const,
    classId: null,
  },
];

const DEMO_STUDENT_USERS = [
  {
    id: "u-joao",
    email: "joao@alfenas.demo",
    name: "João Pedro Silva",
  },
];

let seeded = false;

export async function ensureNetworkSeeded(): Promise<void> {
  if (!process.env.DATABASE_URL || seeded) return;
  try {
    const d = db();

    await d
      .insert(schools)
      .values({
        id: SCHOOL_ID,
        tenantId: TENANT_ID,
        name: "EM Padre Eustáquio",
      })
      .onConflictDoNothing();

    await d
      .insert(classes)
      .values({
        id: CLASS_ID,
        tenantId: TENANT_ID,
        schoolId: SCHOOL_ID,
        name: "7º A",
        grade: "7",
        year: new Date().getFullYear(),
      })
      .onConflictDoNothing();

    await d
      .insert(users)
      .values(
        [...DEMO_NON_STUDENTS, ...DEMO_STUDENT_USERS].map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
        })),
      )
      .onConflictDoNothing();

    await d
      .insert(memberships)
      .values(
        DEMO_NON_STUDENTS.map((u) => ({
          id: `mem-${u.id}`,
          userId: u.id,
          tenantId: TENANT_ID,
          role: u.role,
          schoolId: u.role === "professor" ? SCHOOL_ID : null,
          classId: u.classId,
        })),
      )
      .onConflictDoNothing();

    for (const u of DEMO_NON_STUDENTS) {
      await d
        .update(memberships)
        .set({
          schoolId: u.role === "professor" ? SCHOOL_ID : null,
          classId: u.classId,
        })
        .where(
          and(
            eq(memberships.userId, u.id),
            eq(memberships.tenantId, TENANT_ID),
            eq(memberships.role, u.role),
          ),
        );
    }

    await d
      .insert(students)
      .values(
        ALUNOS_7A.map((a) => {
          const isJoao = a.id === "a1";
          return {
            id: isJoao ? "student-joao" : `student-${a.id}`,
            tenantId: TENANT_ID,
            userId: isJoao ? "u-joao" : null,
            schoolId: SCHOOL_ID,
            classId: CLASS_ID,
            fullName: a.nome,
            nickname: a.nome.split(" ")[0] ?? null,
          };
        }),
      )
      .onConflictDoNothing();

    await d
      .insert(habilities)
      .values(
        HABILIDADES_BNCC.map((h) => ({
          code: h.codigo,
          area: h.area,
          description: h.desc,
          grade: "7",
        })),
      )
      .onConflictDoNothing();

    const profRows = ALUNOS_7A.flatMap((a) =>
      HABILIDADES_BNCC.map((h, i) => ({
        tenantId: TENANT_ID,
        studentId: a.id === "a1" ? "student-joao" : `student-${a.id}`,
        habilityCode: h.codigo,
        score: scoreFor(a.prof, i),
        level: jitterLevel(a.prof, i),
        sampleSize: 4 + (i % 3),
      })),
    );

    if (profRows.length > 0) {
      await d
        .insert(studentProficiency)
        .values(profRows)
        .onConflictDoNothing();
    }

    seeded = true;
  } catch (err) {
    console.error("[seed-network] failed:", err);
  }
}

function scoreFor(base: string, i: number): number {
  const baseScore =
    base === "avancada"
      ? 0.88
      : base === "adequada"
        ? 0.7
        : base === "basica"
          ? 0.5
          : 0.3;
  const jitter = ((i * 7) % 13) / 100 - 0.06;
  const n = Math.max(0.05, Math.min(0.98, baseScore + jitter));
  return Number(n.toFixed(2));
}

function jitterLevel(
  base: "avancada" | "adequada" | "basica" | "insuficiente",
  i: number,
): "avancada" | "adequada" | "basica" | "insuficiente" {
  if (i % 5 !== 0) return base;
  const levels = ["avancada", "adequada", "basica", "insuficiente"] as const;
  const idx = levels.indexOf(base);
  const shift = i % 2 === 0 ? -1 : 1;
  return levels[Math.max(0, Math.min(3, idx + shift))]!;
}
