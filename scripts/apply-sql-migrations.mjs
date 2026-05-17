import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const MIGRATIONS = {
  prepush: ["0000_prepare_pgvector_and_rls.sql"],
  postpush: [
    "0001_class_materials_focus_and_llm_config.sql",
    "0002_student_announcements.sql",
    "0003_artifacts_diary_and_rls.sql",
    "9999_rls_policies.sql",
  ],
};

const phaseArg = process.argv.find((arg) => arg.startsWith("--phase="));
const phase = phaseArg?.split("=")[1] ?? "all";
const selected =
  phase === "all"
    ? [...MIGRATIONS.prepush, ...MIGRATIONS.postpush]
    : MIGRATIONS[phase];

if (!selected) {
  console.error(`[db:migrate] Fase inválida: ${phase}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[db:migrate] DATABASE_URL não configurada.");
  process.exit(1);
}

const sslMode = process.env.DATABASE_SSL;
const shouldUseSsl =
  sslMode === "true" ||
  (sslMode !== "false" &&
    (databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("neon.tech")));

const client = new Client({
  connectionString: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

try {
  for (const file of selected) {
    const fullPath = path.join(process.cwd(), "drizzle", "migrations", file);
    const sql = await readFile(fullPath, "utf8");
    console.log(`[db:migrate] Aplicando ${file}`);
    await client.query(sql);
  }
  console.log(`[db:migrate] Fase ${phase} concluída.`);
} finally {
  await client.end();
}
