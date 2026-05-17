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
import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import * as schema from "./schema";
import { getRlsTenantId } from "./rls-context";

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
  const pool = createTenantAwarePool(buildPoolConfig(url));
  return drizzle(pool, { schema });
}

function createTenantAwarePool(config: PoolConfig): Pool {
  const pool = new Pool(config);
  const originalQuery = pool.query.bind(pool);
  const originalConnect = pool.connect.bind(pool);

  pool.query = (async (...args: Parameters<Pool["query"]>) => {
    const tenantId = getRlsTenantId();
    if (!tenantId) return originalQuery(...args);

    const client = await originalConnect();
    try {
      await applyTenantContext(client, tenantId);
      return await runClientQuery(client, args);
    } finally {
      await resetTenantContext(client);
      client.release();
    }
  }) as Pool["query"];

  pool.connect = (async () => {
    const client = await originalConnect();
    const tenantId = getRlsTenantId();
    if (!tenantId) return client;

    await applyTenantContext(client, tenantId);
    const originalRelease = client.release.bind(client);
    client.release = ((err?: Error | boolean) => {
      void resetTenantContext(client).finally(() => originalRelease(err));
    }) as PoolClient["release"];
    return client;
  }) as Pool["connect"];

  return pool;
}

async function applyTenantContext(
  client: Pick<PoolClient, "query">,
  tenantId: string,
): Promise<void> {
  await client.query("select set_config('app.tenant_id', $1, false)", [tenantId]);
}

async function resetTenantContext(
  client: Pick<PoolClient, "query">,
): Promise<void> {
  try {
    await client.query("reset app.tenant_id");
  } catch (err) {
    console.warn("[db/rls] tenant context reset failed:", err);
  }
}

function runClientQuery(
  client: PoolClient,
  args: Parameters<Pool["query"]>,
): Promise<QueryResult<QueryResultRow>> {
  const query = client.query as unknown as (
    ...queryArgs: Parameters<Pool["query"]>
  ) => Promise<QueryResult<QueryResultRow>>;
  return query(...args);
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
    connectionTimeoutMillis: Number(
      process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 8000,
    ),
    query_timeout: Number(process.env.DATABASE_QUERY_TIMEOUT_MS ?? 12000),
    statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 12000),
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function db(): DbClient {
  if (!cached) cached = build();
  return cached;
}

export { schema };
