type EnvFallbackProps = {
  title?: string;
  description?: string;
  missing?: string[];
};

export default function EnvFallback({
  title = "Configuration requise",
  description = "Certaines variables d'environnement serveur sont manquantes. L'application ne peut pas charger ces donnees pour le moment.",
  missing = [],
}: EnvFallbackProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col gap-4 px-6 pb-16 pt-10 text-center">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        {title}
      </h1>
      <p className="text-sm text-[var(--muted)]">{description}</p>
      {missing.length > 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4 text-left text-sm text-[var(--muted)]">
          <div className="font-semibold text-[var(--foreground)]">
            Variables manquantes
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
