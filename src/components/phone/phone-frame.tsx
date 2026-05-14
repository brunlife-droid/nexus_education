import { cn } from "@/lib/cn";

interface PhoneFrameProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

/**
 * Frame de celular (notch + tela arredondada) usado nas telas Aluno.
 * Renderiza um container interno com flex-column.
 */
export function PhoneFrame({ children, label, className }: PhoneFrameProps) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-2.5", className)}>
      <div className="w-[390px] h-[780px] shrink-0 rounded-[44px] bg-[#0F0F0E] p-3 shadow-[var(--shadow-xl)]">
        <div className="phone-screen scroll-thin bg-surface relative flex h-full w-full flex-col overflow-hidden rounded-[32px]">
          <div className="absolute top-4 left-1/2 z-10 h-7 w-[120px] -translate-x-1/2 rounded-2xl bg-[#0F0F0E]" />
          {children}
        </div>
      </div>
      {label && (
        <div
          className="text-text-faint text-[11.5px]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
