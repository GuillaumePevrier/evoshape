import Image from "next/image";
import { cn } from "@/lib/cn";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  labelClassName?: string;
  showLabel?: boolean;
  showBackground?: boolean;
  imageClassName?: string;
  alt?: string;
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-24 w-24",
};

export function Logo({
  className,
  size = "md",
  labelClassName,
  showLabel = true,
  showBackground = true,
  imageClassName,
  alt = "EvoShape",
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          sizeMap[size],
          showBackground
            ? "rounded-2xl bg-[var(--accent-soft)]"
            : "rounded-none bg-transparent"
        )}
        aria-hidden="true"
      >
        <Image
          src="/images/logo.png"
          alt={alt}
          fill
          sizes="100%"
          className={cn("object-contain", imageClassName)}
        />
      </div>
      {showLabel ? (
        <span
          className={cn("text-lg font-semibold tracking-tight", labelClassName)}
        >
          EvoShape
        </span>
      ) : null}
    </div>
  );
}
