import { Logo } from "@/components/logo";
import { HomeAuthCta } from "@/components/home-auth-cta";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(12,141,133,0.28),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 left-[-140px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,200,120,0.3),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <Logo
          size="2xl"
          showBackground={false}
          showLabel={false}
          className="flex-col"
          imageClassName="drop-shadow-[0_20px_40px_rgba(17,16,14,0.2)]"
        />
        <p className="text-sm text-[var(--muted)]">
          Ton suivi, clair et simple. Connecte-toi pour continuer.
        </p>
        <HomeAuthCta />
      </div>
    </main>
  );
}
