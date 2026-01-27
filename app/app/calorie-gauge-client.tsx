"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalorieGauge } from "@/components/calorie-gauge";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { getISODate } from "@/lib/date";
import { cn } from "@/lib/cn";

type MealLog = {
  id: number;
  name: string | null;
  calories: number | null;
  meal_type: string;
  recorded_at: string;
  created_at: string;
};

type ActivityLog = {
  id: number;
  activity_type: string;
  calories_burned: number | null;
  duration_min: number | null;
  recorded_at: string;
  created_at: string;
};

type CalorieGaugeClientProps = {
  userId: string;
  target: number;
  meals: MealLog[];
  activities: ActivityLog[];
  error: string | null;
};

type DrawerType = "meal" | "activity" | null;

export default function CalorieGaugeClient({
  userId,
  target,
  meals,
  activities,
  error,
}: CalorieGaugeClientProps) {
  const [mealLogs, setMealLogs] = useState<MealLog[]>(meals);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(activities);
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [activityType, setActivityType] = useState("");
  const [activityCalories, setActivityCalories] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const mealTotal = mealLogs.reduce(
      (sum, item) => sum + (item.calories ? Number(item.calories) : 0),
      0
    );
    const activityTotal = activityLogs.reduce(
      (sum, item) =>
        sum + (item.calories_burned ? Number(item.calories_burned) : 0),
      0
    );
    const net = mealTotal - activityTotal;
    const delta = net - target;
    return { mealTotal, activityTotal, net, delta };
  }, [activityLogs, mealLogs, target]);

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date());

  const deltaValue = totals.delta;
  const isOver = deltaValue > 0;
  const deltaLabel = target
    ? isOver
      ? `Depassement ${Math.abs(deltaValue).toFixed(0)} kcal`
      : `Reste ${Math.abs(deltaValue).toFixed(0)} kcal`
    : "Objectif a definir";

  const weightKg = totals.delta / 7700;
  const weightG = Math.round(weightKg * 1000);
  const weightSign = weightKg >= 0 ? "+" : "-";
  const weightKgLabel = `${weightSign}${Math.abs(weightKg).toFixed(2)} kg`;
  const weightGLabel = `${weightSign}${Math.abs(weightG).toFixed(0)} g`;

  const closeDrawer = () => setDrawer(null);

  const refreshMeals = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("meal_logs")
      .select("id, name, calories, meal_type, recorded_at, created_at")
      .eq("recorded_at", getISODate())
      .order("created_at", { ascending: false });
    setMealLogs((data ?? []) as MealLog[]);
  };

  const refreshActivities = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("activity_logs")
      .select(
        "id, activity_type, calories_burned, duration_min, recorded_at, created_at"
      )
      .eq("recorded_at", getISODate())
      .order("created_at", { ascending: false });
    setActivityLogs((data ?? []) as ActivityLog[]);
  };

  const handleAddMeal = async (payload?: { calories?: number; name?: string }) => {
    setFeedback(null);
    setClientError(null);
    if (!userId) {
      setClientError("Session introuvable.");
      return;
    }

    const caloriesValue = payload?.calories ?? Number(mealCalories);
    if (!Number.isFinite(caloriesValue) || caloriesValue <= 0) {
      setClientError("Calories invalides.");
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("meal_logs").insert({
      user_id: userId,
      recorded_at: getISODate(),
      meal_type: "snack",
      name: payload?.name ?? (mealName.trim() ? mealName.trim() : null),
      calories: Math.round(caloriesValue),
    });

    if (insertError) {
      setClientError(insertError.message);
      setSaving(false);
      return;
    }

    setMealName("");
    setMealCalories("");
    setFeedback("Repas ajoute.");
    await refreshMeals();
    setSaving(false);
    closeDrawer();
  };

  const handleAddActivity = async (payload?: {
    calories?: number;
    type?: string;
  }) => {
    setFeedback(null);
    setClientError(null);
    if (!userId) {
      setClientError("Session introuvable.");
      return;
    }

    const caloriesValue = payload?.calories ?? Number(activityCalories);
    if (!Number.isFinite(caloriesValue) || caloriesValue <= 0) {
      setClientError("Calories brulees invalides.");
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("activity_logs").insert({
      user_id: userId,
      recorded_at: getISODate(),
      activity_type:
        payload?.type ?? (activityType.trim() ? activityType.trim() : "Activite"),
      duration_min: 0,
      calories_burned: Math.round(caloriesValue),
    });

    if (insertError) {
      setClientError(insertError.message);
      setSaving(false);
      return;
    }

    setActivityType("");
    setActivityCalories("");
    setFeedback("Activite ajoutee.");
    await refreshActivities();
    setSaving(false);
    closeDrawer();
  };

  const handleDeleteMeal = async (id: number) => {
    setClientError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setClientError(deleteError.message);
      return;
    }
    await refreshMeals();
  };

  const handleDeleteActivity = async (id: number) => {
    setClientError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("activity_logs")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setClientError(deleteError.message);
      return;
    }
    await refreshActivities();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Aujourd'hui
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{todayLabel}</p>
        </div>
        <Button href="/app/profile" size="sm" variant="ghost" className="text-lg">
          ⚙️
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {clientError ? <p className="text-sm text-red-600">{clientError}</p> : null}
      {feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="grid gap-6 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Net du jour
              </p>
              <p className="mt-2 text-4xl font-semibold text-[var(--foreground)]">
                {totals.net.toFixed(0)} kcal
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Objectif
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  {target ? `${target.toFixed(0)} kcal` : "--"}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  target
                    ? isOver
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-[var(--border)] bg-white/70 text-[var(--foreground)]"
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Delta
                </p>
                <p className="mt-2 text-base font-semibold">{deltaLabel}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Equivalent poids
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {weightKgLabel} · {weightGLabel}
              </p>
              <p className="text-xs text-[var(--muted)]">est.</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <CalorieGauge net={totals.net} target={target} />
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="space-y-2 border border-orange-200 bg-orange-50/80">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
              Repas
            </p>
            <p className="text-2xl font-semibold text-orange-700">
              +{totals.mealTotal.toFixed(0)} kcal
            </p>
            <p className="text-xs text-orange-700/80">Aujourd'hui</p>
          </Card>
          <Card className="space-y-2 border border-sky-200 bg-sky-50/80">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Sport
            </p>
            <p className="text-2xl font-semibold text-sky-700">
              -{totals.activityTotal.toFixed(0)} kcal
            </p>
            <p className="text-xs text-sky-700/80">Aujourd'hui</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" onClick={() => setDrawer("meal")}>
          + Repas
        </Button>
        <Button size="lg" variant="outline" onClick={() => setDrawer("activity")}>
          + Activite
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Aujourd'hui
          </h2>
          <p className="text-xs text-[var(--muted)]">Repas + activites</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Repas
            </p>
            {mealLogs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Aucun repas ajoute.</p>
            ) : (
              <ul className="space-y-2">
                {mealLogs.map((meal) => (
                  <li
                    key={meal.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {meal.name?.trim() || "Repas"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {(meal.calories ?? 0).toFixed(0)} kcal
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMeal(meal.id)}
                    >
                      Supprimer
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Activites
            </p>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Aucune activite ajoutee.
              </p>
            ) : (
              <ul className="space-y-2">
                {activityLogs.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {activity.activity_type}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {(activity.calories_burned ?? 0).toFixed(0)} kcal brulees
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteActivity(activity.id)}
                    >
                      Supprimer
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {drawer ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 px-4 pb-6"
          onClick={closeDrawer}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_24px_70px_rgba(17,16,14,0.25)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {drawer === "meal" ? "Ajouter un repas" : "Ajouter une activite"}
              </h3>
              <Button type="button" size="sm" variant="ghost" onClick={closeDrawer}>
                Fermer
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {drawer === "meal" ? (
                <>
                  <Input
                    placeholder="Nom (optionnel)"
                    value={mealName}
                    onChange={(event) => setMealName(event.target.value)}
                  />
                  <Input
                    placeholder="Calories"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    value={mealCalories}
                    onChange={(event) => setMealCalories(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={saving}
                    onClick={() => handleAddMeal()}
                  >
                    Ajouter
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    placeholder="Nom (optionnel)"
                    value={activityType}
                    onChange={(event) => setActivityType(event.target.value)}
                  />
                  <Input
                    placeholder="Calories brulees"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    value={activityCalories}
                    onChange={(event) => setActivityCalories(event.target.value)}
                  />
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={saving}
                    onClick={() => handleAddActivity()}
                  >
                    Ajouter
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
