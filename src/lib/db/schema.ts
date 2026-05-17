/**
 * Schema Drizzle · Nexus Education
 *
 * Modelo multi-tenant single-DB: cada tabela "tenant-scoped" tem `tenant_id`
 * e é protegida por Postgres Row-Level Security (políticas configuradas
 * em migration). Tabelas globais (tenants, users, system_prompts) não têm
 * tenant_id.
 *
 * Convenções:
 * - IDs: text PK com cuid2 ou nanoid (geração no app, não no DB)
 * - Timestamps: created_at / updated_at sempre presentes
 * - FKs: ON DELETE RESTRICT para impedir limpeza acidental
 * - Vetores: pgvector(1536) para embeddings (text-embedding-3-small)
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════

export const tenantStatusEnum = pgEnum("tenant_status", [
  "onboarding",
  "trial",
  "ativo",
  "suspenso",
  "encerrado",
]);

export const userRoleEnum = pgEnum("user_role", [
  "aluno",
  "responsavel",
  "professor",
  "coordenador",
  "diretor",
  "orientador",
  "secretaria",
  "admin_nexus",
]);

export const proficiencyEnum = pgEnum("proficiency", [
  "avancada",
  "adequada",
  "basica",
  "insuficiente",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const sreSeverityEnum = pgEnum("sre_severity", [
  "baixa",
  "media",
  "alta",
  "critica",
]);

export const sreStatusEnum = pgEnum("sre_status", [
  "aberto",
  "em_acompanhamento",
  "encerrado",
]);

// ═══════════════════════════════════════════════════════════════════
// TENANTS (global)
// ═══════════════════════════════════════════════════════════════════

export const tenants = pgTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    subdomain: text("subdomain").notNull(),
    name: text("name").notNull(),
    short: text("short").notNull(),
    uf: text("uf").notNull(),
    monogram: text("monogram").notNull(),
    status: tenantStatusEnum("status").notNull().default("onboarding"),

    // Tutora IA
    tutorName: text("tutor_name").notNull(),
    tutorFullName: text("tutor_full_name").notNull(),
    tutorVoiceId: text("tutor_voice_id"),

    // Brand tokens
    primary: text("primary").notNull(),
    primaryHover: text("primary_hover").notNull(),
    primaryFg: text("primary_fg").notNull(),
    primarySoft: text("primary_soft").notNull(),
    primaryBorder: text("primary_border").notNull(),
    secondary: text("secondary").notNull(),
    secondarySoft: text("secondary_soft").notNull(),
    secondaryFg: text("secondary_fg").notNull(),
    logoUrl: text("logo_url"),

    // Contrato
    plan: text("plan").notNull().default("standard"),
    pricePerStudent: real("price_per_student").notNull().default(4.8),
    contractStart: timestamp("contract_start"),
    contractEnd: timestamp("contract_end"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    subdomainIdx: uniqueIndex("tenants_subdomain_idx").on(t.subdomain),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// USERS (global) + MEMBERSHIPS (tenant-scoped)
// ═══════════════════════════════════════════════════════════════════

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    emailVerified: timestamp("email_verified"),
    name: text("name").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    role: userRoleEnum("role").notNull(),
    // Escopo opcional (escola/turma) para roles tipo coordenador
    schoolId: text("school_id"),
    classId: text("class_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userTenantIdx: uniqueIndex("memberships_user_tenant_role_idx").on(
      t.userId,
      t.tenantId,
      t.role,
    ),
    tenantIdx: index("memberships_tenant_idx").on(t.tenantId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// REDE: ESCOLAS, TURMAS, ALUNOS
// ═══════════════════════════════════════════════════════════════════

export const schools = pgTable(
  "schools",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    region: text("region"),
    address: text("address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("schools_tenant_idx").on(t.tenantId),
  }),
);

export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    name: text("name").notNull(), // "7º A"
    grade: text("grade").notNull(), // "7"
    year: integer("year").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("classes_tenant_idx").on(t.tenantId),
    schoolIdx: index("classes_school_idx").on(t.schoolId),
  }),
);

export const students = pgTable(
  "students",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    nickname: text("nickname"),
    birthDate: timestamp("birth_date"),
    cpf: text("cpf"),
    bolsaFamilia: boolean("bolsa_familia").notNull().default(false),
    a11yMode: text("a11y_mode"), // "none" | "easy-read" | "dyslexia" | "tdah"
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("students_tenant_idx").on(t.tenantId),
    schoolIdx: index("students_school_idx").on(t.schoolId),
    classIdx: index("students_class_idx").on(t.classId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// BNCC (global)
// ═══════════════════════════════════════════════════════════════════

export const habilities = pgTable(
  "habilities",
  {
    code: text("code").primaryKey(), // EF07MA04
    area: text("area").notNull(),
    description: text("description").notNull(),
    grade: text("grade"),
  },
  (t) => ({
    areaIdx: index("habilities_area_idx").on(t.area),
  }),
);

export const studentProficiency = pgTable(
  "student_proficiency",
  {
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    habilityCode: text("hability_code")
      .notNull()
      .references(() => habilities.code, { onDelete: "restrict" }),
    score: real("score").notNull(), // 0..1
    level: proficiencyEnum("level").notNull(),
    sampleSize: integer("sample_size").notNull().default(0),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.studentId, t.habilityCode] }),
    tenantIdx: index("student_proficiency_tenant_idx").on(t.tenantId),
  }),
);

export const studentAnnouncements = pgTable(
  "student_announcements",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    schoolId: text("school_id"),
    classId: text("class_id"),
    origin: text("origin").notNull(), // secretaria | escola | turma
    title: text("title").notNull(),
    body: text("body").notNull(),
    authorName: text("author_name").notNull(),
    priority: text("priority").notNull().default("media"),
    requiresConfirmation: boolean("requires_confirmation")
      .notNull()
      .default(false),
    publishedAt: timestamp("published_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("student_announcements_tenant_idx").on(t.tenantId),
    scopeIdx: index("student_announcements_scope_idx").on(
      t.tenantId,
      t.schoolId,
      t.classId,
    ),
    publishedIdx: index("student_announcements_published_idx").on(
      t.publishedAt,
    ),
  }),
);

export const studentAnnouncementReads = pgTable(
  "student_announcement_reads",
  {
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    announcementId: text("announcement_id")
      .notNull()
      .references(() => studentAnnouncements.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.announcementId, t.studentId] }),
    tenantIdx: index("student_announcement_reads_tenant_idx").on(t.tenantId),
    studentIdx: index("student_announcement_reads_student_idx").on(
      t.studentId,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// CONVERSAS (tenant-scoped)
// ═══════════════════════════════════════════════════════════════════

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    title: text("title"),
    area: text("area"), // Matemática, Língua Portuguesa, etc.
    channel: text("channel").notNull().default("web"), // web | whatsapp
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("conversations_tenant_idx").on(t.tenantId),
    studentIdx: index("conversations_student_idx").on(t.studentId),
    updatedIdx: index("conversations_updated_idx").on(t.updatedAt),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    // Quando a mensagem foi gerada por IA, qual modelo/versão
    model: text("model"),
    promptVersion: text("prompt_version"),
    // Tokens consumidos (input + output) para faturamento e observabilidade
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    // Habilidade BNCC classificada (se aplicável)
    habilityCode: text("hability_code"),
    // Anexos (foto, áudio, documento etc.) — referência por blob_url
    attachments: jsonb("attachments").$type<
      Array<
        | {
            kind: "image" | "audio" | "document";
            url: string;
            mime: string;
            name?: string;
            size?: number;
            transcript?: string;
            extractedText?: string;
            analysisError?: string;
          }
        | {
            kind: "source";
            documentId: string;
            documentName: string;
            chunkIndex: number;
            score: number;
          }
      >
    >(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("messages_tenant_idx").on(t.tenantId),
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// RAG · DOCUMENTOS + CHUNKS COM VETOR
// ═══════════════════════════════════════════════════════════════════

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    // tenantId NULL = biblioteca nacional (compartilhada)
    tenantId: text("tenant_id").references(() => tenants.id, {
      onDelete: "restrict",
    }),
    // classId NOT NULL quando kind = 'class_material' (PDF/DOCX subido pela profe)
    classId: text("class_id").references(() => classes.id, {
      onDelete: "cascade",
    }),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    type: text("type").notNull(), // pdf | md | json | docx
    kind: text("kind").notNull().default("national_library"), // class_material | national_library
    status: text("status").notNull().default("ready"), // pending | processing | ready | failed
    sourceUrl: text("source_url"),
    sizeBytes: integer("size_bytes"),
    error: text("error"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    version: text("version"),
    indexedAt: timestamp("indexed_at"),
    retrievalQuality: real("retrieval_quality"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("documents_tenant_idx").on(t.tenantId),
    classIdx: index("documents_class_idx").on(t.classId),
  }),
);

export const chunks = pgTable(
  "chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").references(() => tenants.id, {
      onDelete: "restrict",
    }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    documentIdx: index("chunks_document_idx").on(t.documentId),
    tenantIdx: index("chunks_tenant_idx").on(t.tenantId),
    // Índice HNSW para similaridade vetorial (criado em migration)
  }),
);

// ═══════════════════════════════════════════════════════════════════
// FOCO PEDAGÓGICO DA TURMA (habilidades BNCC priorizadas pela profe)
// ═══════════════════════════════════════════════════════════════════

export const classFocusSkills = pgTable(
  "class_focus_skills",
  {
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    habilityCode: text("hability_code")
      .notNull()
      .references(() => habilities.code, { onDelete: "restrict" }),
    setBy: text("set_by").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.classId, t.habilityCode] }),
    tenantIdx: index("class_focus_skills_tenant_idx").on(t.tenantId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO MACRO DA LLM (editada pelo Admin Nexus)
// ═══════════════════════════════════════════════════════════════════

// llm_routes: rota ativa por capability (modelo + parâmetros). Lida em
// runtime pelo gateway com fallback para a tabela hardcoded em routes.ts.
export const llmRoutes = pgTable("llm_routes", {
  capability: text("capability").primaryKey(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  temperature: real("temperature"),
  maxTokens: integer("max_tokens"),
  fallbackProvider: text("fallback_provider"),
  fallbackModel: text("fallback_model"),
  active: boolean("active").notNull().default(true),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// system_prompts: prompts versionados por capability. Editar = criar
// nova versão. Flag `active` controla qual está em uso (uma por capability).
export const systemPrompts = pgTable(
  "system_prompts",
  {
    id: text("id").primaryKey(),
    capability: text("capability").notNull(),
    version: text("version").notNull(),
    content: text("content").notNull(),
    active: boolean("active").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    capabilityIdx: index("system_prompts_capability_idx").on(t.capability),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// AUDITORIA E LGPD
// ═══════════════════════════════════════════════════════════════════

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id").references(() => tenants.id, {
      onDelete: "restrict",
    }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // student.read, message.send, alert.trigger, etc.
    targetType: text("target_type"), // student | conversation | document
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("audit_log_tenant_idx").on(t.tenantId),
    actorIdx: index("audit_log_actor_idx").on(t.actorUserId),
    createdIdx: index("audit_log_created_idx").on(t.createdAt),
  }),
);

export const consentLog = pgTable(
  "consent_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    guardianName: text("guardian_name").notNull(),
    guardianCpf: text("guardian_cpf"),
    termVersion: text("term_version").notNull(),
    scope: jsonb("scope").$type<string[]>().notNull(),
    ipAddress: text("ip_address"),
    consentedAt: timestamp("consented_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    studentIdx: index("consent_log_student_idx").on(t.studentId),
    tenantIdx: index("consent_log_tenant_idx").on(t.tenantId),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// PROTOCOLO SRE (RESPOSTA SOCIOEMOCIONAL)
// ═══════════════════════════════════════════════════════════════════

export const sreCases = pgTable(
  "sre_cases",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    triggerMessageId: text("trigger_message_id"),
    severity: sreSeverityEnum("severity").notNull(),
    status: sreStatusEnum("status").notNull().default("aberto"),
    signals: jsonb("signals").$type<Record<string, number>>().notNull(), // bullying: 0.82, sofrimento: 0.74
    summary: text("summary").notNull(),
    assignedTo: text("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    familyContactedAt: timestamp("family_contacted_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index("sre_cases_tenant_idx").on(t.tenantId),
    studentIdx: index("sre_cases_student_idx").on(t.studentId),
    statusIdx: index("sre_cases_status_idx").on(t.status),
  }),
);

// ═══════════════════════════════════════════════════════════════════
// RELATIONS (para typesafe joins)
// ═══════════════════════════════════════════════════════════════════

export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(memberships),
  schools: many(schools),
  classes: many(classes),
  students: many(students),
  conversations: many(conversations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  tenant: one(tenants, { fields: [students.tenantId], references: [tenants.id] }),
  school: one(schools, { fields: [students.schoolId], references: [schools.id] }),
  class: one(classes, { fields: [students.classId], references: [classes.id] }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  student: one(students, {
    fields: [conversations.studentId],
    references: [students.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}));
