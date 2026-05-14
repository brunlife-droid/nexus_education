import * as React from "react";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  size?: number;
  bg?: string;
  color?: string;
  className?: string;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  size = 32,
  bg,
  color,
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg ?? "var(--primary-soft)",
        color: color ?? "var(--primary)",
        fontSize: size * 0.4,
      }}
    >
      {initialsOf(name) || "??"}
    </div>
  );
}
