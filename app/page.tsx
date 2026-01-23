import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="relative">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm font-semibold text-[var(--muted)]"
          >
            Deja un compte ?
          </Link>
          <Button href="/auth" variant="primary">
            Se connecter
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Phase 1: suivi regime
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Ton rituel quotidien, sans surcharge.
          </h1>
          <p className="max-w-xl text-base text-[var(--muted)] sm:text-lg">
            EvoShape simplifie ton suivi: profil, poids, repas et activites.
            Visualise l&apos;essentiel chaque jour et garde le cap avec une
            interface claire et motivante.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button href="/auth" size="lg">
              Se connecter
            </Button>
            <Button href="/auth" variant="outline" size="lg">
              Creer un compte
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            <span>Suivi rapide</span>
            <span>Donnees privees</span>
            <span>Rythme durable</span>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Aujourd&apos;hui
              </p>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                72% du cap
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-semibold text-[var(--foreground)]">
                1 680 kcal
              </p>
              <p className="text-sm text-[var(--muted)]">
                Reste 420 kcal pour ton objectif.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Repas", value: "3" },
                { label: "Activites", value: "1" },
                { label: "Poids", value: "72.4 kg" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white/80 px-3 py-4 text-center"
                >
                  <p className="text-xs text-[var(--muted)]">{item.label}</p>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card variant="outline" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Poids
              </p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                -0,8 kg
              </p>
              <p className="text-sm text-[var(--muted)]">
                Variation sur 7 jours.
              </p>
            </Card>
            <Card variant="outline" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Energie
              </p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                2 100 kcal
              </p>
              <p className="text-sm text-[var(--muted)]">
                Objectif journalier cible.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Profil clair",
              description:
                "Centralise ton profil, tes objectifs et tes habitudes de base.",
            },
            {
              title: "Journal smart",
              description:
                "Templates repas + journal quotidien pour aller vite.",
            },
            {
              title: "Rythme motive",
              description:
                "Un dashboard sobre pour rester focus chaque jour.",
            },
          ].map((item) => (
            <Card key={item.title} className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--muted)]">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
