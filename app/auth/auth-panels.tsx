"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { hasSupabaseEnv } from "@/src/lib/supabase/config";

export default function AuthPanels() {
  const router = useRouter();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);

    if (!hasSupabaseEnv) {
      setLoginError("Supabase n'est pas configure.");
      return;
    }

    setLoginLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    router.push("/app");
    router.refresh();
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!hasSupabaseEnv) {
      setRegisterError("Supabase n'est pas configure.");
      return;
    }

    setRegisterLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
    });
    setRegisterLoading(false);

    if (error) {
      setRegisterError(error.message);
      return;
    }

    if (data.user && !data.session) {
      setRegisterSuccess(
        "Compte cree. Verifie ton email pour activer la connexion."
      );
      return;
    }

    router.push("/app");
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Link className="text-sm font-semibold text-[var(--muted)]" href="/">
          Retour accueil
        </Link>
      </header>

      {!hasSupabaseEnv ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--muted)]">
          Supabase n&apos;est pas configure. Ajoute les variables
          d&apos;environnement pour activer l&apos;authentification.
        </div>
      ) : null}

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Connexion
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Reprendre le suivi
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Retrouve ton tableau de bord en quelques secondes.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="vous@email.com"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                disabled={loginLoading || !hasSupabaseEnv}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                disabled={loginLoading || !hasSupabaseEnv}
              />
            </div>
            {loginError ? (
              <p className="text-sm text-red-600">{loginError}</p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={loginLoading || !hasSupabaseEnv}
            >
              {loginLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </Card>

        <Card className="space-y-6" variant="outline">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Inscription
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Demarrer simplement
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Cree ton compte pour activer le suivi personnalise.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="vous@email.com"
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                disabled={registerLoading || !hasSupabaseEnv}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Mot de passe</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Au moins 8 caracteres"
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                disabled={registerLoading || !hasSupabaseEnv}
              />
            </div>
            {registerError ? (
              <p className="text-sm text-red-600">{registerError}</p>
            ) : null}
            {registerSuccess ? (
              <p className="text-sm text-[var(--accent-strong)]">
                {registerSuccess}
              </p>
            ) : null}
            <Button
              type="submit"
              variant="soft"
              className="w-full"
              disabled={registerLoading || !hasSupabaseEnv}
            >
              {registerLoading ? "Creation..." : "Creer un compte"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
