import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { HeroAvatar } from "@/app/home/hero-avatar";

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(12,141,133,0.3),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,200,120,0.35),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),transparent_60%)]" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 pt-4 sm:pt-6">
        <Logo
          size="lg"
          className="gap-4"
          labelClassName="text-2xl sm:text-3xl tracking-tight"
        />
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

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 pb-5 pt-2 lg:min-h-[calc(100svh-72px)] lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-5 lg:pb-3 lg:pt-1">
        <div className="order-2 -mx-4 px-4 sm:mx-0 sm:px-0 lg:order-1 lg:pt-0">
          <HeroAvatar />
        </div>

        <div className="order-1 flex flex-col gap-2 text-center lg:order-2 lg:h-full lg:gap-3 lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Phase 1: suivi regime
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.55rem]">
            EvoShape te montre le mouvement, pas les chiffres froids.
          </h1>
          <p className="mx-auto max-w-md text-sm text-[var(--muted)] sm:hidden">
            Ajuste ton poids cible et suis repas + energie en un clin
            d&apos;oeil.
          </p>
          <p className="mx-auto hidden max-w-xl text-sm text-[var(--muted)] sm:block lg:mx-0 lg:text-base">
            Ajuste ton poids cible, garde un oeil sur tes repas et ton energie.
            Tout est pense pour rester motive avec un suivi simple et visuel.
          </p>
          <div className="hidden flex-wrap justify-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] sm:flex lg:justify-start">
            <span>Poids</span>
            <span>Repas</span>
            <span>Activites</span>
            <span>Objectifs</span>
          </div>
          <div className="hidden space-y-3 text-left sm:block lg:mt-auto">
            <div className="space-y-3 rounded-[22px] border border-white/70 bg-white/70 p-4 shadow-[0_18px_40px_rgba(17,16,14,0.08)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Ton cockpit
              </p>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">
                Un resume clair, du matin au soir.
              </h2>
              <div className="grid gap-3 text-sm font-semibold text-[var(--foreground)] sm:grid-cols-3">
                {[
                  { label: "Kcal nettes", value: "1 620" },
                  { label: "Activites", value: "2 / jour" },
                  { label: "Variation 7j", value: "-0,6 kg" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={`space-y-1 ${
                      index === 0
                        ? ""
                        : "border-t border-white/70 pt-2 sm:border-t-0 sm:border-l sm:pl-3 sm:pt-0"
                    }`}
                  >
                    <p className="text-xs font-medium text-[var(--muted)]">
                      {item.label}
                    </p>
                    <p className="text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden grid-cols-3 gap-3 text-left text-xs xl:grid">
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
                <div
                  key={item.title}
                  className="space-y-2 rounded-[20px] border border-[var(--border)] bg-white/50 p-4 shadow-[0_14px_32px_rgba(17,16,14,0.06)]"
                >
                  <h3 className="text-xs font-semibold text-[var(--foreground)]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
