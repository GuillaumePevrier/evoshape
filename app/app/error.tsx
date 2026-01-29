"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app/error]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center gap-4 px-6 pb-16 pt-10 text-center">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Oups, une erreur est survenue.
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Nous avons rencontre un probleme lors du chargement. Merci de reessayer
        ou de revenir plus tard.
      </p>
      {error.digest ? (
        <p className="text-xs text-[var(--muted)]">Digest: {error.digest}</p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Reessayer
        </button>
        <Link
          href="/"
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
        >
          Retour accueil
        </Link>
      </div>
    </main>
  );
}
