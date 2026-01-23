import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const history = [
  { date: "Aujourd'hui", value: "72.4 kg" },
  { date: "Hier", value: "72.8 kg" },
  { date: "Il y a 7 jours", value: "73.2 kg" },
];

export default function WeightPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Poids"
        description="Ajoute ton poids et observe la tendance."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Nouvelle mesure
          </h2>
          <form className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input id="weight" type="number" placeholder="72.4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </Card>
        <Card variant="outline" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Variation 7 jours
          </p>
          <p className="text-3xl font-semibold text-[var(--foreground)]">
            -0.8 kg
          </p>
          <p className="text-sm text-[var(--muted)]">
            Tendance stable et reguliere.
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Historique
        </h2>
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.date}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
            >
              <span className="text-[var(--muted)]">{item.date}</span>
              <span className="font-semibold text-[var(--foreground)]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
