/**
 * Carrega o Tenant do Postgres, com fallback gracioso pra config in-code.
 *
 * Estratégia:
 * - Sem `DATABASE_URL` ou se a row não existir: usa `TENANTS` de `./config`.
 * - Com DB disponível: mescla a row do banco (campos auditáveis: nome,
 *   subdomain, branding, tutor) com os campos derivados que só existem
 *   in-code por enquanto (`population`, `students`, `teachers`, `schools` —
 *   ainda não temos COUNT real).
 *
 * Idempotente — `ensureTenantsSeeded()` pode ser chamado em todo request,
 * mas é cacheado por instância de processo pra evitar query por request.
 */

import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { tenants as tenantsTable } from "@/lib/db/schema";
import { ALL_TENANTS, TENANTS, type Tenant, type TenantId } from "./config";

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

let seeded = false;

export async function ensureTenantsSeeded(): Promise<void> {
  if (!dbAvailable() || seeded) return;
  try {
    await db()
      .insert(tenantsTable)
      .values(
        ALL_TENANTS.map((t) => ({
          id: t.id,
          subdomain: t.subdomain,
          name: t.name,
          short: t.short,
          uf: t.uf,
          monogram: t.monogram,
          status: "ativo" as const,
          tutorName: t.tutorName,
          tutorFullName: t.tutorFull,
          primary: t.primary,
          primaryHover: t.primaryHover,
          primaryFg: t.primaryFg,
          primarySoft: t.primarySoft,
          primaryBorder: t.primaryBorder,
          secondary: t.secondary,
          secondarySoft: t.secondarySoft,
          secondaryFg: t.secondaryFg,
        })),
      )
      .onConflictDoNothing({ target: tenantsTable.id });
    seeded = true;
  } catch (err) {
    console.error("[tenants/db] seed failed:", err);
  }
}

export const loadTenantFromDb = cache(
  async (id: TenantId): Promise<Tenant> => {
    const inCode = TENANTS[id];
    if (!dbAvailable()) return inCode;

    try {
      await ensureTenantsSeeded();
      const rows = await db()
        .select()
        .from(tenantsTable)
        .where(eq(tenantsTable.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) return inCode;

      return {
        ...inCode,
        id: row.id as TenantId,
        name: row.name,
        short: row.short,
        uf: row.uf,
        subdomain: row.subdomain,
        monogram: row.monogram,
        tutorName: row.tutorName,
        tutorFull: row.tutorFullName,
        primary: row.primary,
        primaryHover: row.primaryHover,
        primaryFg: row.primaryFg,
        primarySoft: row.primarySoft,
        primaryBorder: row.primaryBorder,
        secondary: row.secondary,
        secondarySoft: row.secondarySoft,
        secondaryFg: row.secondaryFg,
      };
    } catch (err) {
      console.error("[tenants/db] load failed:", err);
      return inCode;
    }
  },
);
