"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type NavLinkProps = {
  href: string;
  label: string;
  secondary?: string;
};

export function AppNavLink({ href, label, secondary }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium transition",
        isActive
          ? "border-[var(--border)] bg-[var(--surface)]"
          : "text-[var(--muted)] hover:border-[var(--border)] hover:bg-white/70"
      )}
    >
      <span className="font-semibold text-[var(--foreground)]">{label}</span>
      {secondary ? (
        <span className="text-xs text-[var(--muted)]">{secondary}</span>
      ) : null}
    </Link>
  );
}
