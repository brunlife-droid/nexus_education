import { ChatClient } from "@/components/phone/chat-client";
import { getCurrentTenant } from "@/lib/tenants/server";
import { CHAT_INICIAL } from "@/lib/mocks";

export default async function ChatPage() {
  const tenant = await getCurrentTenant();

  const initialMessages = CHAT_INICIAL.map((m) => ({
    role: m.from === "user" ? ("user" as const) : ("assistant" as const),
    content: m.text,
    hora: m.hora,
  }));

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
    />
  );
}
