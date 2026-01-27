import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(12,141,133,0.28),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 left-[-140px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,200,120,0.3),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <Logo size="xl" showBackground={false} />
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            EvoShape, le suivi clair au quotidien.
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Garde le cap sur tes objectifs avec un journal simple et une jauge
            lisible.
          </p>
        </div>
        <Button href="/auth" size="lg" className="w-full">
          Se connecter / Creer un compte
        </Button>
        <p className="text-xs text-[var(--muted)]">Connexion ou creation en 30 secondes.</p>
      </div>
    </main>
  );
}
