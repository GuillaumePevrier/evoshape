"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppNavLink } from "@/components/app/nav-link";
import { LogoutButton } from "@/components/app/logout-button";

type NavItem = {
  href: string;
  label: string;
  secondary?: string;
};

type MobileNavProps = {
  items: NavItem[];
  unreadCount?: number | null;
};

export function MobileNav({ items, unreadCount }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        ☰
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-4 pb-4 md:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_70px_rgba(17,16,14,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Menu
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Fermer
              </Button>
            </div>

            <nav className="mt-4 flex flex-col gap-2">
              {items.map((item) => (
                <AppNavLink
                  key={item.href}
                  {...item}
                  badgeCount={
                    item.href === "/app/notifications" ? unreadCount ?? 0 : undefined
                  }
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-end">
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
