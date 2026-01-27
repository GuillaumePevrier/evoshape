import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { AppNavLink } from "@/components/app/nav-link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/app/logout-button";
import { OneSignalSessionSync } from "@/components/app/onesignal-session-sync";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const navItems = [
  { href: "/app", label: "Dashboard", secondary: "Resume" },
  { href: "/app/profile", label: "Profil", secondary: "Objectifs" },
  { href: "/app/weight", label: "Poids", secondary: "Historique" },
  { href: "/app/food", label: "Repas", secondary: "Journal" },
  { href: "/app/activity", label: "Activite", secondary: "Calories" },
  { href: "/app/notifications", label: "Notifications", secondary: "Centre" },
  { href: "/app/settings", label: "Parametres", secondary: "Push" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth");
  }

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.user.id)
    .is("read_at", null)
    .is("deleted_at", null);

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
  const safariWebId = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID ?? "";

  return (
    <div className="min-h-screen pb-10">
      <OneSignalSessionSync
        userId={data.user.id}
        appId={appId}
        safariWebId={safariWebId}
      />
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button href="/app/settings" variant="outline" size="sm">
              Parametres
            </Button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-8 md:flex-row">
        <aside className="flex w-full flex-col gap-3 md:sticky md:top-24 md:w-60 md:self-start">
          <div className="rounded-3xl border border-[var(--border)] bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Navigation
            </p>
            <nav className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <AppNavLink
                  key={item.href}
                  {...item}
                  badgeCount={
                    item.href === "/app/notifications"
                      ? unreadCount ?? 0
                      : undefined
                  }
                />
              ))}
            </nav>
          </div>
          <div className="hidden rounded-3xl border border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--muted)] md:block">
            Tu progresses jour apres jour. Garde le rythme et observe la
            tendance.
          </div>
        </aside>

        <main className="min-h-[70vh] flex-1 rounded-[32px] border border-[var(--border)] bg-white/80 p-6 shadow-[0_30px_80px_rgba(17,16,14,0.08)]">
          {children}
        </main>
      </div>

      <footer className="mx-auto mt-8 flex w-full max-w-6xl items-center justify-between px-6 text-xs text-[var(--muted)]">
        <span>EvoShape Phase 1</span>
        <Link href="/">Retour accueil</Link>
      </footer>
    </div>
  );
}
