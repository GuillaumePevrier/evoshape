import Link from "next/link";

export default function AppNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center gap-4 px-6 pb-16 pt-10 text-center">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Page introuvable
      </h1>
      <p className="text-sm text-[var(--muted)]">
        La page demandee n&apos;existe pas ou a ete deplacee.
      </p>
      <Link
        href="/app"
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
      >
        Retour au tableau de bord
      </Link>
    </main>
  );
}
