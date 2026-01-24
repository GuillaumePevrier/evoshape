import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HeroAvatar } from "@/app/home/hero-avatar";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(12,141,133,0.3),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,200,120,0.35),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent_60%)]" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
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

      <section className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pb-16 pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Phase 1: suivi regime
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            EvoShape te montre le mouvement, pas les chiffres froids.
          </h1>
          <p className="max-w-xl text-base text-[var(--muted)] sm:text-lg">
            Ajuste ton poids cible, garde un oeil sur tes repas et ton energie.
            Tout est pense pour rester motive avec un suivi simple et visuel.
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
            <span>Poids</span>
            <span>Repas</span>
            <span>Activites</span>
            <span>Objectifs</span>
          </div>
        </div>

        <div className="order-first lg:order-last">
          <HeroAvatar />
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Ton cockpit
            </p>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              Un resume clair, du matin au soir.
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Visualise les calories, la balance du jour et la direction de ta
              semaine. Rien de plus, rien de moins.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Kcal nettes", value: "1 620" },
                { label: "Activites", value: "2 / jour" },
                { label: "Variation 7j", value: "-0,6 kg" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4 text-sm font-semibold text-[var(--foreground)] shadow-[0_12px_30px_rgba(17,16,14,0.08)]"
                >
                  <p className="text-xs font-medium text-[var(--muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4">
            {[
              {
                title: "Profil ultra simple",
                description:
                  "Fixe tes objectifs et garde un profil propre en une minute.",
              },
              {
                title: "Journal express",
                description:
                  "Templates repas + ajout rapide pour ne jamais perdre le fil.",
              },
              {
                title: "Progression motivee",
                description:
                  "Des tendances claires pour rester engage chaque semaine.",
              },
            ].map((item) => (
              <Card key={item.title} variant="outline" className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  {item.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
