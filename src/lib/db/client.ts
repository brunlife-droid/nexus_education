/**
 * Cliente Drizzle para Postgres.
 *
 * Em runtime sem DATABASE_URL configurada, exporta um proxy que
 * lança erro descritivo na primeira query — isso permite que o app
 * faça build e renderize páginas estáticas/mockadas durante a Fase 0.
 *
 * Quando o usuário fornecer a connection string Postgres (variável de
 * ambiente DATABASE_URL), as queries reais passam a funcionar sem
 * mudança de código.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DbClient | null = null;

function build(): DbClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return new Proxy({} as DbClient, {
      get() {
        throw new Error(
          "DATABASE_URL não configurada. Defina a connection string Postgres " +
            "para usar queries reais. Veja docs/SETUP.md.",
        );
      },
    });
  }
  const pool = new Pool(buildPoolConfig(url));
  return drizzle(pool, { schema });
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const sslMode = process.env.DATABASE_SSL;
  const shouldUseSsl =
    sslMode === "true" ||
    (sslMode !== "false" &&
      (connectionString.includes("sslmode=require") ||
        connectionString.includes("neon.tech")));

  return {
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function db(): DbClient {
  if (!cached) cached = build();
  return cached;
}

export { schema };
