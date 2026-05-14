import * as React from "react";
import { cn } from "@/lib/cn";

export type ProficiencyLevel =
  | "avancada"
  | "adequada"
  | "basica"
  | "insuficiente";

const PROF_MAP: Record<
  ProficiencyLevel,
  { label: string; color: string; soft: string }
> = {
  avancada: {
    label: "Avançada",
    color: "var(--prof-advanced)",
    soft: "var(--prof-advanced-soft)",
  },
  adequada: {
    label: "Adequada",
    color: "var(--prof-adequate)",
    soft: "var(--prof-adequate-soft)",
  },
  basica: {
    label: "Básica",
    color: "var(--prof-basic)",
    soft: "var(--prof-basic-soft)",
  },
  insuficiente: {
    label: "Insuficiente",
    color: "var(--prof-insufficient)",
    soft: "var(--prof-insufficient-soft)",
  },
};

interface ProfBadgeProps {
  value: ProficiencyLevel;
  className?: string;
}

export function ProfBadge({ value, className }: ProfBadgeProps) {
  const meta = PROF_MAP[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
        className,
      )}
      style={{ background: meta.soft, color: meta.color }}
    >
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}
