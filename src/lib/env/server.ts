type EnvStatus = { ok: true } | { ok: false; missing: string[] };

const resolveSupabaseMissingEnv = () => {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  ) {
    missing.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)"
    );
  }
  return missing;
};

export const getSupabaseServerEnvStatus = (): EnvStatus => {
  const missing = resolveSupabaseMissingEnv();
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
};

export const logMissingServerEnv = (context: string, missing: string[]) => {
  // eslint-disable-next-line no-console
  console.error("[env] Missing server env", { context, missing });
};
