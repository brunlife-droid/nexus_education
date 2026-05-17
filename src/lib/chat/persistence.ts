/**
 * Persistência de chat (conversations + messages).
 *
 * Funções graceful: se DATABASE_URL não está setada ou query falha,
 * loga e devolve `null` em vez de propagar — o chat continua streamando
 * em modo efêmero. Isso preserva a UX de demo sem DB.
 */

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";

export type DbMessageRole = "user" | "assistant" | "system";

export type MediaMessageAttachment = {
  kind: "image" | "audio" | "document";
  url: string;
  mime: string;
  name?: string;
  size?: number;
  transcript?: string;
  extractedText?: string;
  analysisError?: string;
};

export type MessageSourceAttachment = {
  kind: "source";
  documentId: string;
  documentName: string;
  chunkIndex: number;
  score: number;
};

export type MessageAttachment =
  | MediaMessageAttachment
  | MessageSourceAttachment;

export interface PersistedMessage {
  id: string;
  role: DbMessageRole;
  content: string;
  createdAt: Date;
  attachments: MessageAttachment[] | null;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  area: string | null;
  updatedAt: Date;
  createdAt: Date;
}

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

function titleFromText(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= 60) return clean;
  return clean.slice(0, 57) + "...";
}

export async function createConversation(input: {
  tenantId: string;
  studentId: string;
  title?: string;
  area?: string;
  channel?: "web" | "whatsapp";
}): Promise<string | null> {
  if (!dbAvailable()) return null;
  try {
    const id = randomUUID();
    await db()
      .insert(conversations)
      .values({
        id,
        tenantId: input.tenantId,
        studentId: input.studentId,
        title: input.title ? titleFromText(input.title) : null,
        area: input.area ?? null,
        channel: input.channel ?? "web",
      });
    return id;
  } catch (err) {
    console.error("[chat/persistence] createConversation failed:", err);
    return null;
  }
}

export async function appendMessage(input: {
  tenantId: string;
  conversationId: string;
  role: DbMessageRole;
  content: string;
  attachments?: MessageAttachment[];
  model?: string;
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}): Promise<string | null> {
  if (!dbAvailable()) return null;
  try {
    const id = randomUUID();
    await db().insert(messages).values({
      id,
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      attachments: input.attachments ?? null,
      model: input.model ?? null,
      promptVersion: input.promptVersion ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      latencyMs: input.latencyMs ?? null,
    });
    return id;
  } catch (err) {
    console.error("[chat/persistence] appendMessage failed:", err);
    return null;
  }
}

export async function touchConversation(input: {
  tenantId: string;
  conversationId: string;
  title?: string;
}): Promise<void> {
  if (!dbAvailable()) return;
  try {
    await db()
      .update(conversations)
      .set({
        updatedAt: new Date(),
        ...(input.title ? { title: titleFromText(input.title) } : {}),
      })
      .where(
        and(
          eq(conversations.id, input.conversationId),
          eq(conversations.tenantId, input.tenantId),
        ),
      );
  } catch (err) {
    console.error("[chat/persistence] touchConversation failed:", err);
  }
}

export async function listConversations(input: {
  tenantId: string;
  studentId: string;
  limit?: number;
}): Promise<ConversationSummary[]> {
  if (!dbAvailable()) return [];
  try {
    const rows = await db()
      .select({
        id: conversations.id,
        title: conversations.title,
        area: conversations.area,
        updatedAt: conversations.updatedAt,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, input.tenantId),
          eq(conversations.studentId, input.studentId),
        ),
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(input.limit ?? 100);
    return rows;
  } catch (err) {
    console.error("[chat/persistence] listConversations failed:", err);
    return [];
  }
}

export async function loadMessages(input: {
  tenantId: string;
  conversationId: string;
}): Promise<PersistedMessage[]> {
  if (!dbAvailable()) return [];
  try {
    const rows = await db()
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
        attachments: messages.attachments,
      })
      .from(messages)
      .where(
        and(
          eq(messages.tenantId, input.tenantId),
          eq(messages.conversationId, input.conversationId),
        ),
      )
      .orderBy(asc(messages.createdAt));
    return rows as PersistedMessage[];
  } catch (err) {
    console.error("[chat/persistence] loadMessages failed:", err);
    return [];
  }
}

export async function getConversationOwner(input: {
  tenantId: string;
  conversationId: string;
}): Promise<{ studentId: string } | null> {
  if (!dbAvailable()) return null;
  try {
    const rows = await db()
      .select({ studentId: conversations.studentId })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, input.conversationId),
          eq(conversations.tenantId, input.tenantId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch (err) {
    console.error("[chat/persistence] getConversationOwner failed:", err);
    return null;
  }
}
