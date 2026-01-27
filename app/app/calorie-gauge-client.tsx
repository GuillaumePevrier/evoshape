"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalorieGauge } from "@/components/calorie-gauge";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { getISODate } from "@/lib/date";

const QUICK_MEALS = [200, 500, 800];
const QUICK_ACTIVITIES = [
  { label: "Marche", calories: 150 },
  { label: "Course", calories: 350 },
  { label: "Muscu", calories: 250 },
];

const formatSigned = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toFixed(0)}`;

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

export default function CalorieGaugeClient({
  userId,
  target,
  meals,
  activities,
  error,
}: CalorieGaugeClientProps) {
  const [mealLogs, setMealLogs] = useState<MealLog[]>(meals);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(activities);
  const [mealOpen, setMealOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);
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

  const weightKg = totals.delta / 7700;
  const weightG = weightKg * 1000;

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
      <PageHeader
        title="Jauge du jour"
        description="Tout est visible et editable ici : repas, activites, net du jour."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/app/profile" size="sm" variant="ghost">
              Profil
            </Button>
            <Button href="/app/weight" size="sm" variant="ghost">
              Historique
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {clientError ? <p className="text-sm text-red-600">{clientError}</p> : null}
      {feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <CalorieGauge net={totals.net} target={target} />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Repas aujourd'hui", value: `+${totals.mealTotal.toFixed(0)} kcal` },
            {
              label: "Sport aujourd'hui",
              value: `-${totals.activityTotal.toFixed(0)} kcal`,
            },
            { label: "Net", value: `${totals.net.toFixed(0)} kcal` },
            { label: "Objectif", value: target ? `${target.toFixed(0)} kcal` : "--" },
            {
              label: "Delta",
              value: `${formatSigned(totals.delta)} kcal`,
            },
            {
              label: "Equivalent poids",
              value: `${weightKg >= 0 ? "+" : "-"}${Math.abs(weightKg).toFixed(2)} kg · ${
                weightG >= 0 ? "+" : "-"
              }${Math.abs(weightG).toFixed(0)} g`,
              note: "estimation",
            },
          ].map((item) => (
            <Card key={item.label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {item.label}
              </p>
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {item.value}
              </p>
              {item.note ? (
                <p className="text-xs text-[var(--muted)]">{item.note}</p>
              ) : null}
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Ajouter un repas
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMealOpen((value) => !value)}
            >
              + Repas
            </Button>
          </div>
          {mealOpen ? (
            <div className="space-y-3">
              <div className="grid gap-2">
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
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_MEALS.map((calories) => (
                  <Button
                    key={calories}
                    type="button"
                    variant="soft"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleAddMeal({ calories })}
                  >
                    +{calories} kcal
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => handleAddMeal()}
              >
                Ajouter
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Ajouter une activite
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivityOpen((value) => !value)}
            >
              + Activite
            </Button>
          </div>
          {activityOpen ? (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Input
                  placeholder="Type (optionnel)"
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
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIVITIES.map((activity) => (
                  <Button
                    key={activity.label}
                    type="button"
                    variant="soft"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      handleAddActivity({
                        calories: activity.calories,
                        type: activity.label,
                      })
                    }
                  >
                    {activity.label} -{activity.calories} kcal
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => handleAddActivity()}
              >
                Ajouter
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Aujourd'hui
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Repas + activites en un coup d'oeil
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Repas
            </p>
            {mealLogs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Aucun repas ajoute.
              </p>
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
    </div>
  );
}
