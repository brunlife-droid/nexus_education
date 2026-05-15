CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."proficiency" AS ENUM('avancada', 'adequada', 'basica', 'insuficiente');--> statement-breakpoint
CREATE TYPE "public"."sre_severity" AS ENUM('baixa', 'media', 'alta', 'critica');--> statement-breakpoint
CREATE TYPE "public"."sre_status" AS ENUM('aberto', 'em_acompanhamento', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('onboarding', 'trial', 'ativo', 'suspenso', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('aluno', 'responsavel', 'professor', 'coordenador', 'diretor', 'orientador', 'secretaria', 'admin_nexus');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"tenant_id" text,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"grade" text NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"guardian_name" text NOT NULL,
	"guardian_cpf" text,
	"term_version" text NOT NULL,
	"scope" jsonb NOT NULL,
	"ip_address" text,
	"consented_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"title" text,
	"area" text,
	"channel" text DEFAULT 'web' NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"source_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" text,
	"indexed_at" timestamp,
	"retrieval_quality" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habilities" (
	"code" text PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"description" text NOT NULL,
	"grade" text
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"role" "user_role" NOT NULL,
	"school_id" text,
	"class_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"prompt_version" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"hability_code" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"region" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sre_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"trigger_message_id" text,
	"severity" "sre_severity" NOT NULL,
	"status" "sre_status" DEFAULT 'aberto' NOT NULL,
	"signals" jsonb NOT NULL,
	"summary" text NOT NULL,
	"assigned_to" text,
	"family_contacted_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_proficiency" (
	"tenant_id" text NOT NULL,
	"student_id" text NOT NULL,
	"hability_code" text NOT NULL,
	"score" real NOT NULL,
	"level" "proficiency" NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_proficiency_student_id_hability_code_pk" PRIMARY KEY("student_id","hability_code")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"full_name" text NOT NULL,
	"nickname" text,
	"birth_date" timestamp,
	"cpf" text,
	"bolsa_familia" boolean DEFAULT false NOT NULL,
	"a11y_mode" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"subdomain" text NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"uf" text NOT NULL,
	"monogram" text NOT NULL,
	"status" "tenant_status" DEFAULT 'onboarding' NOT NULL,
	"tutor_name" text NOT NULL,
	"tutor_full_name" text NOT NULL,
	"tutor_voice_id" text,
	"primary" text NOT NULL,
	"primary_hover" text NOT NULL,
	"primary_fg" text NOT NULL,
	"primary_soft" text NOT NULL,
	"primary_border" text NOT NULL,
	"secondary" text NOT NULL,
	"secondary_soft" text NOT NULL,
	"secondary_fg" text NOT NULL,
	"logo_url" text,
	"plan" text DEFAULT 'standard' NOT NULL,
	"price_per_student" real DEFAULT 4.8 NOT NULL,
	"contract_start" timestamp,
	"contract_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"email_verified" timestamp,
	"name" text NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sre_cases" ADD CONSTRAINT "sre_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sre_cases" ADD CONSTRAINT "sre_cases_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sre_cases" ADD CONSTRAINT "sre_cases_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_proficiency" ADD CONSTRAINT "student_proficiency_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_proficiency" ADD CONSTRAINT "student_proficiency_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_proficiency" ADD CONSTRAINT "student_proficiency_hability_code_habilities_code_fk" FOREIGN KEY ("hability_code") REFERENCES "public"."habilities"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_tenant_idx" ON "audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chunks_document_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_tenant_idx" ON "chunks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "classes_tenant_idx" ON "classes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "classes_school_idx" ON "classes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "consent_log_student_idx" ON "consent_log" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "consent_log_tenant_idx" ON "consent_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversations_student_idx" ON "conversations" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "documents_tenant_idx" ON "documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "habilities_area_idx" ON "habilities" USING btree ("area");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_tenant_role_idx" ON "memberships" USING btree ("user_id","tenant_id","role");--> statement-breakpoint
CREATE INDEX "memberships_tenant_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_idx" ON "messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "schools_tenant_idx" ON "schools" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sre_cases_tenant_idx" ON "sre_cases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sre_cases_student_idx" ON "sre_cases" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "sre_cases_status_idx" ON "sre_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "student_proficiency_tenant_idx" ON "student_proficiency" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "students_tenant_idx" ON "students" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "students_school_idx" ON "students" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "students_class_idx" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_subdomain_idx" ON "tenants" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");