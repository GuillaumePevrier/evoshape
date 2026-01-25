import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { formatShortDate, getISODate } from "@/lib/date";
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
  const weeklyNet = netSeries.reduce((sum, value) => sum + value, 0);
  const averageNet = weeklyNet / 7;

  const normalizedWeights = [...weights]
    .map((entry) => ({
      recorded_at: entry.recorded_at,
      weight_kg: Number(entry.weight_kg),
    }))
    .filter((entry) => Number.isFinite(entry.weight_kg))
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

  const recentWeights = normalizedWeights.slice(-7);
  const weightSeries = recentWeights.map((entry) => entry.weight_kg);
  const averageWeight =
    recentWeights.length > 0
      ? recentWeights.reduce((sum, entry) => sum + entry.weight_kg, 0) /
        recentWeights.length
      : null;

  const hasWeightSeries = recentWeights.length > 0;
  const hasNetSeries = meals.length > 0 || activities.length > 0;
  const weightMin = hasWeightSeries ? Math.min(...weightSeries) : null;
  const weightMax = hasWeightSeries ? Math.max(...weightSeries) : null;
  const weightRangeLabel =
    recentWeights.length > 1
      ? `${formatShortDate(recentWeights[0].recorded_at)} - ${formatShortDate(
          recentWeights[recentWeights.length - 1].recorded_at
        )}`
      : recentWeights.length === 1
        ? formatShortDate(recentWeights[0].recorded_at)
        : null;

  const netMin = hasNetSeries ? Math.min(...netSeries) : null;
  const netMax = hasNetSeries ? Math.max(...netSeries) : null;

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

      <Card className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Resume hebdo
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
            <p className="text-xs text-[var(--muted)]">Calories nettes</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {weeklyNet >= 0 ? "+" : ""}
              {weeklyNet.toFixed(0)} kcal
            </p>
            <p className="text-xs text-[var(--muted)]">
              Moyenne: {averageNet >= 0 ? "+" : ""}
              {averageNet.toFixed(0)} kcal / jour
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
            <p className="text-xs text-[var(--muted)]">Poids moyen</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {averageWeight ? `${averageWeight.toFixed(1)} kg` : "--"}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Basé sur les 7 dernieres mesures.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Poids (7 dernieres mesures)
              </p>
              {weightRangeLabel ? (
                <p className="text-xs text-[var(--muted)]">{weightRangeLabel}</p>
              ) : null}
            </div>
            {hasWeightSeries ? (
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {weightMin?.toFixed(1)} - {weightMax?.toFixed(1)} kg
              </p>
            ) : null}
          </div>
          {hasWeightSeries ? (
            <Sparkline
              values={weightSeries}
              id="weight"
              height={96}
              className="text-[var(--accent)]"
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Ajoute des mesures pour voir la courbe.
            </p>
          )}
        </Card>
        <Card className="space-y-3" variant="outline">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Calories nettes (7 jours)
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatShortDate(lastSevenDays[0])} -{" "}
                {formatShortDate(lastSevenDays[lastSevenDays.length - 1])}
              </p>
            </div>
            {hasNetSeries ? (
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {netMin?.toFixed(0)} - {netMax?.toFixed(0)} kcal
              </p>
            ) : null}
          </div>
          {hasNetSeries ? (
            <Sparkline
              values={netSeries}
              id="net"
              height={96}
              className="text-[#F2A75A]"
            />
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
