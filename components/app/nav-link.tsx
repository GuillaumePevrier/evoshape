"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type NavLinkProps = {
  href: string;
  label: string;
  secondary?: string;
  badgeCount?: number;
  onClick?: () => void;
};

export function AppNavLink({
  href,
  label,
  secondary,
  badgeCount,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const showBadge = typeof badgeCount === "number" && badgeCount > 0;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium transition",
        isActive
          ? "border-[var(--border)] bg-[var(--surface)]"
          : "text-[var(--muted)] hover:border-[var(--border)] hover:bg-white/70"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--foreground)]">{label}</span>
        {showBadge ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">
            {badgeCount}
          </span>
        ) : null}
      </div>
      {secondary ? (
        <span className="text-xs text-[var(--muted)]">{secondary}</span>
      ) : null}
    </Link>
  );
}
