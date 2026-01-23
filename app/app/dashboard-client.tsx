import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { getISODate } from "@/lib/date";
import { calculateDelta7Days } from "@/lib/metrics";

type MealLog = {
  calories: number | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  recorded_at: string;
};

type ActivityLog = {
  calories_burned: number | null;
  recorded_at: string;
};

type WeightEntry = {
  recorded_at: string;
  weight_kg: number | string;
};

type DashboardClientProps = {
  target: number;
  meals: MealLog[];
  activities: ActivityLog[];
  weights: WeightEntry[];
  error: string | null;
};

export default function DashboardClient({
  target,
  meals,
  activities,
  weights,
  error,
}: DashboardClientProps) {
  const today = getISODate();
  const todayMeals = meals.filter((meal) => meal.recorded_at === today);
  const todayActivities = activities.filter(
    (activity) => activity.recorded_at === today
  );

  const consumed = todayMeals.reduce(
    (total, item) => total + (item.calories ? Number(item.calories) : 0),
    0
  );
  const burned = todayActivities.reduce(
    (total, item) =>
      total + (item.calories_burned ? Number(item.calories_burned) : 0),
    0
  );
  const mealTotals = todayMeals.reduce<Record<string, number>>((acc, item) => {
    const current = acc[item.meal_type] ?? 0;
    acc[item.meal_type] = current + (item.calories ?? 0);
    return acc;
  }, {});

  const remaining = target - consumed + burned;
  const latestWeight = weights[0] ? Number(weights[0].weight_kg) : null;
  const delta7 = calculateDelta7Days(weights);

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return getISODate(date);
  });

  const mealByDate = meals.reduce<Record<string, number>>((acc, item) => {
    acc[item.recorded_at] =
      (acc[item.recorded_at] ?? 0) + (item.calories ?? 0);
    return acc;
  }, {});

  const activityByDate = activities.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.recorded_at] =
        (acc[item.recorded_at] ?? 0) + (item.calories_burned ?? 0);
      return acc;
    },
    {}
  );

  const netSeries = lastSevenDays.map(
    (date) => (mealByDate[date] ?? 0) - (activityByDate[date] ?? 0)
  );

  const weightByDate = weights.reduce<Record<string, number>>((acc, item) => {
    const value = Number(item.weight_kg);
    if (!Number.isNaN(value)) {
      acc[item.recorded_at] = value;
    }
    return acc;
  }, {});

  let lastWeight: number | null = null;
  const weightSeries = lastSevenDays.map((date) => {
    const value = weightByDate[date];
    if (value !== undefined) {
      lastWeight = value;
    }
    return lastWeight ?? 0;
  });

  const hasWeightSeries = weightSeries.some((value) => value > 0);
  const hasNetSeries = netSeries.some((value) => value !== 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Le recapitulatif du jour pour rester focus."
        action={
          <Button href="/app/food" variant="soft">
            Ajouter un repas
          </Button>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            label: "Consommees",
            value: `${consumed.toFixed(0)} kcal`,
            note: target ? `Objectif ${target} kcal` : "Objectif a definir",
          },
          {
            label: "Brulees",
            value: `${burned.toFixed(0)} kcal`,
            note: "Activites",
          },
          {
            label: "Restantes",
            value: `${remaining.toFixed(0)} kcal`,
            note: "Encore aujourd'hui",
          },
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
              { label: "Petit dejeuner", key: "breakfast" },
              { label: "Dejeuner", key: "lunch" },
              { label: "Diner", key: "dinner" },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {(mealTotals[item.key] ?? 0).toFixed(0)} kcal
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
            {latestWeight ? `${latestWeight.toFixed(1)} kg` : "--"}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {delta7 === null
              ? "Ajoute plus de mesures pour la tendance."
              : `${delta7 >= 0 ? "+" : ""}${delta7.toFixed(
                  1
                )} kg sur 7 jours.`}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Poids 7 jours
          </p>
          {hasWeightSeries ? (
            <Sparkline values={weightSeries} />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Ajoute des mesures pour voir la courbe.
            </p>
          )}
        </Card>
        <Card className="space-y-3" variant="outline">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Calories nettes 7 jours
          </p>
          {hasNetSeries ? (
            <Sparkline values={netSeries} />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Ajoute des repas pour alimenter le suivi.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
