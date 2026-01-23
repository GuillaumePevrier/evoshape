import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const activities = [
  { name: "Marche rapide", duration: "35 min", calories: 180 },
  { name: "Yoga doux", duration: "20 min", calories: 60 },
];

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Activites"
        description="Ajoute tes activites et les calories brulees."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Nouvelle activite
          </h2>
          <form className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="activity-type">Type</Label>
              <Input id="activity-type" placeholder="Ex: Course, Yoga" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-duration">Duree (min)</Label>
              <Input id="activity-duration" type="number" placeholder="30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-calories">Calories brulees</Label>
              <Input id="activity-calories" type="number" placeholder="210" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </Card>

        <Card variant="outline" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Total aujourd&apos;hui
          </p>
          <p className="text-3xl font-semibold text-[var(--foreground)]">
            320 kcal
          </p>
          <p className="text-sm text-[var(--muted)]">
            Continue a bouger pour booster ton energie.
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Journal du jour
        </h2>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
            >
              <span className="font-semibold text-[var(--foreground)]">
                {activity.name}
              </span>
              <span className="text-[var(--muted)]">{activity.duration}</span>
              <span className="text-[var(--foreground)]">
                {activity.calories} kcal
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
