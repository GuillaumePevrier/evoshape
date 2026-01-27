"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { hasSupabaseEnv } from "@/src/lib/supabase/config";

type Mode = "login" | "register";

export default function AuthPanels() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasSupabaseEnv) {
      setError("Supabase n'est pas configure.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    if (mode === "login") {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (loginError) {
        setError(loginError.message);
        return;
      }

      router.push("/app");
      router.refresh();
      return;
    }

    const { data, error: registerError } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (registerError) {
      setError(registerError.message);
      return;
    }

    if (data.user && !data.session) {
      setSuccess("Compte cree. Verifie ton email pour activer la connexion.");
      return;
    }

    router.push("/app");
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 pb-16 pt-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo
          size="2xl"
          showBackground={false}
          showLabel={false}
          className="flex-col"
        />
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {mode === "login" ? "Bon retour" : "Creer ton compte"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {mode === "login"
              ? "Connecte-toi pour retrouver ta jauge."
              : "Commence le suivi en moins d'une minute."}
          </p>
        </div>
      </div>

      {!hasSupabaseEnv ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--muted)]">
          Supabase n&apos;est pas configure. Ajoute les variables
          d&apos;environnement pour activer l&apos;authentification.
        </div>
      ) : null}

      <Card className="mt-8 space-y-6">
        <div className="rounded-full border border-[var(--border)] bg-white/70 p-1">
          <div className="grid grid-cols-2">
            {([
              { label: "Connexion", value: "login" },
              { label: "Inscription", value: "register" },
            ] as const).map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-semibold transition",
                  mode === item.value
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
                onClick={() => setMode(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="vous@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading || !hasSupabaseEnv}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Mot de passe</Label>
            <Input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading || !hasSupabaseEnv}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-sm text-[var(--accent-strong)]">{success}</p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !hasSupabaseEnv}
          >
            {loading
              ? mode === "login"
                ? "Connexion..."
                : "Creation..."
              : mode === "login"
                ? "Se connecter"
                : "Creer un compte"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
