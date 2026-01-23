import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "solid" | "outline";
};

export function Card({ className, variant = "solid", ...props }: CardProps) {
  const variantStyles =
    variant === "solid"
      ? "bg-[var(--surface)] shadow-[0_20px_60px_rgba(17,16,14,0.08)]"
      : "border border-[var(--border)] bg-transparent";

  return (
    <div
      className={cn(
        "rounded-3xl p-6 backdrop-blur-sm",
        variantStyles,
        className
      )}
      {...props}
    />
  );
}
