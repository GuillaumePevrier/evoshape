import { cn } from "@/lib/cn";

type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  labelClassName?: string;
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export function Logo({ className, size = "md", labelClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-2xl bg-[var(--accent-soft)] bg-[url('/images/logo.png')] bg-contain bg-center bg-no-repeat",
          sizeMap[size]
        )}
        aria-hidden="true"
      />
      <span
        className={cn("text-lg font-semibold tracking-tight", labelClassName)}
      >
        EvoShape
      </span>
    </div>
  );
}
