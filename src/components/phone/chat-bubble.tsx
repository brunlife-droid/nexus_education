import { cn } from "@/lib/cn";

interface ChatBubbleProps {
  from: "user" | "tutor";
  tutorInitial?: string;
  hora?: string;
  children: React.ReactNode;
}

export function ChatBubble({
  from,
  tutorInitial,
  hora,
  children,
}: ChatBubbleProps) {
  if (from === "tutor") {
    return (
      <div className="flex max-w-[86%] items-end gap-2 self-start">
        <div
          className="bg-primary-soft text-primary flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {tutorInitial}
        </div>
        <div
          className={cn(
            "bg-surface text-text border-border max-w-full rounded-2xl border px-3.5 py-2.5 text-[15px] leading-relaxed shadow-[var(--shadow-xs)]",
            "rounded-tl-md",
          )}
        >
          {children}
          {hora && (
            <div className="text-text-faint mt-1.5 text-[10.5px]">{hora}</div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="self-end">
      <div
        className={cn(
          "bg-primary text-primary-fg max-w-[76%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed shadow-[var(--shadow-xs)]",
          "rounded-tr-md",
        )}
      >
        {children}
        {hora && (
          <div className="text-primary-fg/70 mt-1 text-right text-[10.5px]">
            {hora} ✓✓
          </div>
        )}
      </div>
    </div>
  );
}
