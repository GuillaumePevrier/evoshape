import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Le recapitulatif du jour pour rester focus."
        action={<Button variant="soft">Ajouter une entree</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "Consommees", value: "1 680 kcal", note: "Objectif 2 100" },
          { label: "Brulees", value: "320 kcal", note: "Activites" },
          { label: "Restantes", value: "740 kcal", note: "Encore aujourd'hui" },
        ].map((item) => (
          <Card key={item.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {item.label}
            </p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {item.value}
            </p>
            <p className="text-sm text-[var(--muted)]">{item.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Apercu du jour
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Petit dejeuner", value: "420 kcal" },
              { label: "Dejeuner", value: "680 kcal" },
              { label: "Diner", value: "580 kcal" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-3" variant="outline">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Dernier poids
          </h2>
          <p className="text-3xl font-semibold text-[var(--foreground)]">
            72.4 kg
          </p>
          <p className="text-sm text-[var(--muted)]">
            -0.8 kg sur les 7 derniers jours.
          </p>
        </Card>
      </div>
    </div>
  );
}
