import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Link className="text-sm font-semibold text-[var(--muted)]" href="/">
          Retour accueil
        </Link>
      </header>

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
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="vous@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input id="login-password" type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full">
              Se connecter
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
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="vous@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Mot de passe</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Au moins 8 caracteres"
              />
            </div>
            <Button type="submit" variant="soft" className="w-full">
              Creer un compte
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
