import {
  ChatClient,
  type ChatClientMessage,
  type MessageSource,
} from "@/components/phone/chat-client";
import { getCurrentTenant } from "@/lib/tenants/server";
import { CHAT_INICIAL } from "@/lib/mocks";
import { requireRole } from "@/lib/auth/session";
import { resolveStudentId } from "@/lib/db/student-resolver";
import {
  loadMessages,
  getConversationOwner,
  type MessageSourceAttachment,
  type PersistedMessage,
} from "@/lib/chat/persistence";

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function sourceAttachments(
  attachments: PersistedMessage["attachments"],
): MessageSource[] | undefined {
  const sources = attachments
    ?.filter(
      (attachment): attachment is MessageSourceAttachment =>
        attachment.kind === "source",
    )
    .map((source) => ({
      documentId: source.documentId,
      documentName: source.documentName,
      chunkIndex: source.chunkIndex,
      score: source.score,
    }));

  return sources && sources.length > 0 ? sources : undefined;
}

export default async function ChatPage({ searchParams }: PageProps) {
  const user = await requireRole("aluno", "responsavel");
  const tenant = await getCurrentTenant();
  const { id: requestedId } = await searchParams;

  let conversationId: string | null = null;
  let initialMessages: ChatClientMessage[] = [];

  if (requestedId) {
    const studentId = await resolveStudentId({
      userId: user.id,
      tenantId: tenant.id,
    });
    if (studentId) {
      const owner = await getConversationOwner({
        tenantId: tenant.id,
        conversationId: requestedId,
      });
      if (owner && owner.studentId === studentId) {
        conversationId = requestedId;
        const persisted = await loadMessages({
          tenantId: tenant.id,
          conversationId: requestedId,
        });
        initialMessages = persisted
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            hora: formatTime(m.createdAt),
            sources: sourceAttachments(m.attachments),
          }));
      }
    }
  }

  if (!conversationId && initialMessages.length === 0) {
    initialMessages = CHAT_INICIAL.map((m) => ({
      role: m.from === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
      hora: m.hora,
    }));
  }

  return (
    <ChatClient
      tenant={{
        primary: tenant.primary,
        primaryFg: tenant.primaryFg,
        primarySoft: tenant.primarySoft,
        secondary: tenant.secondary,
        short: tenant.short,
        tutorName: tenant.tutorName,
      }}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
    />
  );
}
