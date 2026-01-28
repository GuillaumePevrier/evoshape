"use client";

import { useMemo, useRef, useState, useEffect, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalorieGauge } from "@/components/calorie-gauge";
import { LogoutButton } from "@/components/app/logout-button";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { getISODate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { Sparkline } from "@/components/ui/sparkline";

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

type WeightEntry = {
  id: number;
  recorded_at: string;
  weight_kg: number | string;
};

type Profile = {
  display_name: string | null;
  sex: string | null;
  birth_year: number | null;
  height_cm: number | null;
  target_calories: number | null;
} | null;

type CalorieGaugeClientProps = {
  userId: string;
  profile: Profile;
  latestWeight: WeightEntry | null;
  meals: MealLog[];
  activities: ActivityLog[];
  netSeries7: number[];
  netSeries30: number[];
  weightEntries: WeightEntry[];
  error: string | null;
};

type SheetView = "menu" | "meal" | "activity" | "weight" | "reports";

const viewModeDescriptions: Record<"today" | "summary" | "focus", string> = {
  today: "Vue complete avec jauge, stats et actions rapides.",
  summary: "Resume compact pour verifier le net rapidement.",
  focus: "Mode minimal pour se concentrer sur l'essentiel.",
};

type WheelAction = {
  id: SheetView | "profile" | "notifications" | "settings";
  label: string;
  helper?: string;
  icon?: string;
  type: "sheet" | "route";
  href?: string;
};

const DEFAULT_TARGET = 2000;
const ACTIVITY_FACTOR = 1.2;

const QUICK_MEALS = [200, 500, 800];
const QUICK_ACTIVITIES = [
  { label: "Marche", calories: 150 },
  { label: "Course", calories: 350 },
  { label: "Muscu", calories: 250 },
];

const wheelActions: WheelAction[] = [
  {
    id: "meal",
    label: "Ajouter repas",
    helper: "Calories + nom",
    icon: "🍽️",
    type: "sheet",
  },
  {
    id: "activity",
    label: "Ajouter activite",
    helper: "Calories brulees",
    icon: "🏃",
    type: "sheet",
  },
  {
    id: "weight",
    label: "Ajouter poids",
    helper: "Poids du jour",
    icon: "⚖️",
    type: "sheet",
  },
  {
    id: "reports",
    label: "Rapports",
    helper: "7 & 30 jours",
    icon: "📊",
    type: "sheet",
  },
  {
    id: "profile",
    label: "Profil",
    helper: "Objectifs & profil",
    icon: "👤",
    type: "route",
    href: "/app/profile",
  },
  {
    id: "settings",
    label: "Parametres",
    helper: "Preferences",
    icon: "⚙️",
    type: "route",
    href: "/app/settings",
  },
  {
    id: "notifications",
    label: "Notifications",
    helper: "Messages & alertes",
    icon: "🔔",
    type: "route",
    href: "/app/notifications",
  },
];

function computeDailyTarget(
  profile: Profile,
  latestWeight: WeightEntry | null,
  burned: number
) {
  const sex = profile?.sex ?? null;
  const heightCm = profile?.height_cm ?? null;
  const birthYear = profile?.birth_year ?? null;
  const weightRaw = latestWeight?.weight_kg ?? null;
  const weightKg = weightRaw ? Number(weightRaw) : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;

  const missingFields = [
    !sex,
    !heightCm,
    !birthYear,
    !Number.isFinite(weightKg ?? NaN),
    !Number.isFinite(age ?? NaN),
  ];
  const hasCore = missingFields.every((value) => !value);

  let baseTarget = profile?.target_calories ?? DEFAULT_TARGET;

  if (hasCore && weightKg && heightCm && age !== null) {
    const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr = sex === "male" ? bmrBase + 5 : sex === "female" ? bmrBase - 161 : null;
    if (bmr && Number.isFinite(bmr)) {
      baseTarget = Math.round(bmr * ACTIVITY_FACTOR);
    }
  }

  const adjustedTarget = Math.max(0, Math.round(baseTarget + burned));

  return {
    baseTarget,
    adjustedTarget,
    hasCore,
  };
}

function formatSigned(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(value).toFixed(0)}`;
}

export default function CalorieGaugeClient({
  userId,
  profile,
  latestWeight,
  meals,
  activities,
  netSeries7,
  netSeries30,
  weightEntries,
  error,
}: CalorieGaugeClientProps) {
  const router = useRouter();
  const [mealLogs, setMealLogs] = useState<MealLog[]>(meals);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(activities);
  const [weightEntriesState, setWeightEntriesState] =
    useState<WeightEntry[]>(weightEntries);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [activityType, setActivityType] = useState("");
  const [activityCalories, setActivityCalories] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetView, setSheetView] = useState<SheetView>("menu");
  const [mounted, setMounted] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [reportRange, setReportRange] = useState<"7" | "30">("7");
  const [viewMode, setViewMode] = useState<"today" | "summary" | "focus">("today");

  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    return { mealTotal, activityTotal, net };
  }, [activityLogs, mealLogs]);

  const latestWeightEntry = useMemo(
    () =>
      weightEntriesState.length > 0
        ? weightEntriesState[weightEntriesState.length - 1]
        : latestWeight,
    [latestWeight, weightEntriesState]
  );

  const targetData = useMemo(
    () => computeDailyTarget(profile, latestWeightEntry, totals.activityTotal),
    [profile, latestWeightEntry, totals.activityTotal]
  );

  const delta = totals.net - targetData.adjustedTarget;
  const weightKg = delta / 7700;
  const weightG = Math.round(weightKg * 1000);
  const remaining = targetData.adjustedTarget - totals.net;
  const progressValue =
    targetData.adjustedTarget > 0
      ? Math.min(Math.max(totals.net / targetData.adjustedTarget, 0), 1)
      : 0;
  const progressPercent = Math.round(progressValue * 100);
  const statusBadge =
    remaining >= 0
      ? {
          label: "Dans l'objectif",
          className: "bg-emerald-100 text-emerald-700",
        }
      : {
          label: "Au-dessus",
          className: "bg-red-100 text-red-700",
        };

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date());

  const showGauge = viewMode !== "summary";
  const showStats = viewMode === "today";
  const showWeightEquivalent = viewMode !== "focus";
  const hasLogs = mealLogs.length > 0 || activityLogs.length > 0;

  const reportSeries = reportRange === "7" ? netSeries7 : netSeries30;
  const reportStats = useMemo(() => {
    if (reportSeries.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0 };
    }
    const total = reportSeries.reduce((sum, value) => sum + value, 0);
    const average = total / reportSeries.length;
    const min = Math.min(...reportSeries);
    const max = Math.max(...reportSeries);
    return { total, average, min, max };
  }, [reportSeries]);

  const trendDelta = useMemo(() => {
    if (netSeries7.length < 2) {
      return null;
    }
    const latest = netSeries7[netSeries7.length - 1];
    const previous = netSeries7[netSeries7.length - 2];
    return latest - previous;
  }, [netSeries7]);

  const reportInsight = useMemo(() => {
    if (reportSeries.length === 0) {
      return "Ajoute quelques jours pour voir ta tendance.";
    }
    if (reportStats.average === 0) {
      return "Net stable sur la periode.";
    }
    if (reportStats.average < 0) {
      return "Tendance en dessous de l'objectif, continue comme ca.";
    }
    return "Tendance au-dessus de l'objectif, ajuste en douceur.";
  }, [reportSeries.length, reportStats.average]);

  const reportWeightDelta = useMemo(() => {
    if (weightEntriesState.length < 2) return null;
    const days = reportRange === "7" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const filtered = weightEntriesState
      .filter((entry) => new Date(entry.recorded_at) >= cutoff)
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      );
    if (filtered.length < 2) return null;
    const first = Number(filtered[0].weight_kg);
    const last = Number(filtered[filtered.length - 1].weight_kg);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
    return last - first;
  }, [reportRange, weightEntriesState]);

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

  const refreshWeight = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("weights")
      .select("id, recorded_at, weight_kg")
      .gte("recorded_at", getISODate(new Date(Date.now() - 29 * 86400000)))
      .order("recorded_at", { ascending: true });
    setWeightEntriesState((data ?? []) as WeightEntry[]);
  };

  const openSheet = () => {
    setSheetOpen(true);
    requestAnimationFrame(() => setSheetVisible(true));
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setSheetView("menu");
    setSheetOffset(0);
    setIsDragging(false);
    window.setTimeout(() => setSheetOpen(false), 220);
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
    closeSheet();
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
    closeSheet();
  };

  const handleAddWeight = async () => {
    setFeedback(null);
    setClientError(null);
    if (!userId) {
      setClientError("Session introuvable.");
      return;
    }

    const weightNumber = Number(weightValue);
    if (!Number.isFinite(weightNumber) || weightNumber <= 0) {
      setClientError("Poids invalide.");
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("weights").upsert({
      user_id: userId,
      recorded_at: getISODate(),
      weight_kg: Number(weightNumber.toFixed(1)),
    });

    if (insertError) {
      setClientError(insertError.message);
      setSaving(false);
      return;
    }

    setWeightValue("");
    setFeedback("Poids enregistre.");
    await refreshWeight();
    setSaving(false);
    closeSheet();
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

  const handleAction = (action: WheelAction) => {
    if (action.type === "route" && action.href) {
      router.push(action.href);
      closeSheet();
      return;
    }
    if (action.type === "sheet") {
      setSheetView(action.id as SheetView);
    }
  };

  const handleSheetDragStart = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = event.clientY ?? null;
    setIsDragging(true);
  };

  const handleSheetDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const deltaY = event.clientY - dragStart.current;
    if (deltaY > 0) {
      setSheetOffset(Math.min(deltaY, 240));
    }
  };

  const handleSheetDragEnd = () => {
    if (sheetOffset > 120) {
      closeSheet();
    } else {
      setSheetOffset(0);
    }
    setIsDragging(false);
    dragStart.current = null;
  };

  const sheetContent = (
    <div
      className={cn(
        "sheet-backdrop fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 transition-opacity duration-200",
        sheetVisible ? "bg-black/45 opacity-100" : "opacity-0"
      )}
      onClick={closeSheet}
    >
      <div
        className={cn(
          "sheet-pop w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(17,16,14,0.25)] transition-transform duration-300"
        )}
        style={{
          transform: `translateY(${sheetOffset + (sheetVisible ? 0 : 24)}px)`,
          transitionTimingFunction: isDragging
            ? "linear"
            : "cubic-bezier(0.18, 0.9, 0.32, 1.2)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 rounded-3xl bg-[var(--surface)]/95 px-5 pb-3 pt-4 backdrop-blur">
          <div
            className="mx-auto mb-3 h-2 w-14 rounded-full bg-[var(--border)]"
            role="presentation"
            onPointerDown={handleSheetDragStart}
            onPointerMove={handleSheetDragMove}
            onPointerUp={handleSheetDragEnd}
            onPointerCancel={handleSheetDragEnd}
          />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {sheetView === "menu" ? "Actions rapides" : "Suivi"}
              </p>
              <p className="text-base font-semibold text-[var(--foreground)]">
                {sheetView === "menu"
                  ? "Selectionne une action"
                  : sheetView === "reports"
                    ? "Rapports"
                    : "Ajouter"}
              </p>
            </div>
            {sheetView !== "menu" ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSheetView("menu")}
              >
                Retour
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={closeSheet}
              >
                Fermer
              </Button>
            )}
          </div>
        </div>

        {sheetView === "menu" ? (
          <div className="fade-slide-in px-5 pb-5 pt-4 space-y-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
              {wheelActions
                .filter((action) => action.type === "sheet")
                .map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="flex min-w-[150px] snap-center flex-col items-start gap-1 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 text-left text-sm font-semibold text-[var(--foreground)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                    onClick={() => handleAction(action)}
                  >
                    <div className="flex items-center gap-2">
                      {action.icon ? (
                        <span className="text-lg" aria-hidden="true">
                          {action.icon}
                        </span>
                      ) : null}
                      <span>{action.label}</span>
                    </div>
                    {action.helper ? (
                      <span className="text-xs font-medium text-[var(--muted)]">
                        {action.helper}
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Raccourcis
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {wheelActions
                  .filter((action) => action.type === "route")
                  .map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(action)}
                      className="gap-2"
                    >
                      {action.icon ? (
                        <span className="text-sm" aria-hidden="true">
                          {action.icon}
                        </span>
                      ) : null}
                      {action.label}
                    </Button>
                  ))}
              </div>
              {wheelActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="flex min-w-[150px] snap-center flex-col items-start gap-1 rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-3 text-left text-sm font-semibold text-[var(--foreground)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  onClick={() => handleAction(action)}
                >
                  <span>{action.label}</span>
                  {action.helper ? (
                    <span className="text-xs font-medium text-[var(--muted)]">
                      {action.helper}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Aujourd&apos;hui
                </p>
                <div className="mt-3 grid gap-2">
                  {mealLogs.length === 0 && activityLogs.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      Aucun enregistrement pour l&apos;instant.
                    </p>
                  ) : (
                    <>
                      {mealLogs.slice(0, 3).map((meal) => (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-[var(--foreground)]">
                            {meal.name?.trim() || "Repas"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--muted)]">
                              +{(meal.calories ?? 0).toFixed(0)}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-red-600"
                              onClick={() => handleDeleteMeal(meal.id)}
                            >
                              Suppr.
                            </button>
                          </div>
                        </div>
                      ))}
                      {activityLogs.slice(0, 3).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-[var(--foreground)]">
                            {activity.activity_type}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--muted)]">
                              -{(activity.calories_burned ?? 0).toFixed(0)}
                            </span>
                            <button
                              type="button"
                              className="text-xs text-red-600"
                              onClick={() => handleDeleteActivity(activity.id)}
                            >
                              Suppr.
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <LogoutButton />
              </div>
            </div>
          </div>
        ) : null}

        {sheetView === "meal" ? (
          <div className="fade-slide-in px-5 pb-5 pt-4 space-y-3">
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
                  +{calories}
                </Button>
              ))}
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)]/95 pt-2">
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={saving}
                onClick={() => handleAddMeal()}
              >
                Ajouter repas
              </Button>
            </div>
          </div>
        ) : null}

        {sheetView === "activity" ? (
          <div className="fade-slide-in px-5 pb-5 pt-4 space-y-3">
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
                  {activity.label} -{activity.calories}
                </Button>
              ))}
            </div>
            <div className="sticky bottom-0 bg-[var(--surface)]/95 pt-2">
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={saving}
                onClick={() => handleAddActivity()}
              >
                Ajouter activite
              </Button>
            </div>
          </div>
        ) : null}

        {sheetView === "weight" ? (
          <div className="fade-slide-in px-5 pb-5 pt-4 space-y-3">
            <Input
              placeholder="Poids (kg)"
              inputMode="decimal"
              type="number"
              min={0}
              step="0.1"
              value={weightValue}
              onChange={(event) => setWeightValue(event.target.value)}
            />
            <div className="sticky bottom-0 bg-[var(--surface)]/95 pt-2">
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={saving}
                onClick={handleAddWeight}
              >
                Enregistrer le poids
              </Button>
            </div>
          </div>
        ) : null}

        {sheetView === "reports" ? (
          <div className="fade-slide-in px-5 pb-5 pt-4 space-y-3">
            <div className="flex rounded-full border border-[var(--border)] bg-white/80 p-1 text-xs font-semibold shadow-sm">
              {(["7", "30"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 transition",
                    reportRange === range
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                  onClick={() => setReportRange(range)}
                >
                  {range} jours
                </button>
              ))}
            </div>
            <Sparkline
              values={reportSeries}
              width={260}
              height={70}
              id={`net-sheet-${reportRange}`}
              className="text-[var(--accent)]"
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Net moyen
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      reportStats.average >= 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {reportStats.average >= 0 ? "+" : "-"}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-[var(--foreground)]">
                  {reportStats.average.toFixed(0)} kcal
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Total net
                  </p>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">
                    {reportRange}j
                  </span>
                </div>
                <p className="mt-1 font-semibold text-[var(--foreground)]">
                  {reportStats.total.toFixed(0)} kcal
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Mini / Maxi
                  </p>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                    net
                  </span>
                </div>
                <p className="mt-1 font-semibold text-[var(--foreground)]">
                  {reportStats.min.toFixed(0)} / {reportStats.max.toFixed(0)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    Poids
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      reportWeightDelta === null
                        ? "bg-white/80 text-[var(--muted)]"
                        : reportWeightDelta >= 0
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {reportWeightDelta === null ? "n/a" : "7j"}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-[var(--foreground)]">
                  {reportWeightDelta === null
                    ? "--"
                    : `${reportWeightDelta >= 0 ? "+" : "-"}${Math.abs(
                        reportWeightDelta
                      ).toFixed(1)} kg`}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {clientError ? (
          <p className="mt-3 px-5 pb-2 text-sm text-red-600">{clientError}</p>
        ) : null}
        {feedback ? (
          <p className="mt-2 px-5 pb-5 text-sm text-[var(--accent-strong)]">
            {feedback}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="relative space-y-5 pb-28">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Aujourd&apos;hui
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{todayLabel}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {viewModeDescriptions[viewMode]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Objectif ajuste
          </p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {targetData.adjustedTarget.toFixed(0)} kcal
          </p>
          <p className="text-[10px] text-[var(--muted)]">avec le sport</p>
          <div className="flex rounded-full border border-[var(--border)] bg-white/80 p-1 text-[11px] font-semibold shadow-sm">
            {[
              { id: "today", label: "Jour" },
              { id: "summary", label: "Resume" },
              { id: "focus", label: "Focus" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 transition",
                  viewMode === item.id
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
                onClick={() =>
                  setViewMode(item.id as "today" | "summary" | "focus")
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {clientError ? <p className="text-sm text-red-600">{clientError}</p> : null}

      {!targetData.hasCore && viewMode !== "focus" ? (
        <Card className="border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm text-amber-800">
            Complete ton profil (sexe, taille, age, poids) pour un objectif
            ajuste plus precis.
          </p>
        </Card>
      ) : null}

      {showGauge ? (
        <Card className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <CalorieGauge
              consumed={totals.mealTotal}
              burned={totals.activityTotal}
              target={targetData.adjustedTarget}
              net={totals.net}
              delta={delta}
            />
            {viewMode === "today" ? (
              <p className="text-xs text-[var(--muted)]">
                Objectif de base {targetData.baseTarget.toFixed(0)} kcal · ajuste
                avec le sport
              </p>
            ) : null}
            {trendDelta !== null && viewMode !== "focus" ? (
              <div className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                {trendDelta >= 0 ? "+" : "-"}
                {Math.abs(trendDelta).toFixed(0)} kcal vs hier
              </div>
            ) : null}
            {viewMode !== "focus" ? (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  statusBadge.className
                )}
              >
                {statusBadge.label}
              </span>
            ) : null}
            {viewMode !== "focus" ? (
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                {[
                  {
                    label: "Consommees",
                    value: `${totals.mealTotal.toFixed(0)} kcal`,
                    tone: "text-orange-700 bg-orange-100/80",
                  },
                  {
                    label: "Brulees",
                    value: `${totals.activityTotal.toFixed(0)} kcal`,
                    tone: "text-sky-700 bg-sky-100/80",
                  },
                  {
                    label: "Restantes",
                    value: `${remaining >= 0 ? "" : "-"}${Math.abs(
                      remaining
                    ).toFixed(0)} kcal`,
                    tone:
                      remaining >= 0
                        ? "text-emerald-700 bg-emerald-100/80"
                        : "text-red-700 bg-red-100/80",
                  },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={cn(
                      "rounded-full px-3 py-1 shadow-sm",
                      item.tone
                    )}
                  >
                    {item.label} · {item.value}
                  </span>
                ))}
              </div>
            ) : null}
            {viewMode !== "focus" ? (
              <div className="w-full max-w-xs space-y-2 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                  <span>Progression net</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-[var(--accent)] to-sky-300 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Objectif {targetData.adjustedTarget.toFixed(0)} kcal</span>
                  <span>Net {totals.net.toFixed(0)} kcal</span>
                </div>
              </div>
            ) : null}
            {viewMode !== "focus" ? (
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-[var(--muted)]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  Repas
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
                  Sport
                </span>
              </div>
            ) : null}
            {viewMode !== "focus" ? (
              <div className="grid w-full max-w-sm grid-cols-3 gap-2">
                {[
                  { label: "Repas", icon: "🍽️", view: "meal" as SheetView },
                  {
                    label: "Activite",
                    icon: "🏃",
                    view: "activity" as SheetView,
                  },
                  { label: "Poids", icon: "⚖️", view: "weight" as SheetView },
                ].map((item) => (
                  <Button
                    key={item.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-2"
                    onClick={() => {
                      openSheet();
                      setSheetView(item.view);
                    }}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {!hasLogs && viewMode === "today" ? (
        <Card className="space-y-3 border border-[var(--border)] bg-white/70">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Demarrer simplement
            </p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              Ajoute un repas ou une activite pour lancer ton suivi du jour.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="soft"
              onClick={() => {
                openSheet();
                setSheetView("meal");
              }}
            >
              Ajouter un repas
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                openSheet();
                setSheetView("activity");
              }}
            >
              Ajouter une activite
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Rapport {reportRange} jours
            </p>
            <div className="flex rounded-full border border-[var(--border)] bg-white/80 p-1 text-xs font-semibold shadow-sm">
              {(["7", "30"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 transition",
                    reportRange === range
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                  onClick={() => setReportRange(range)}
                >
                  {range}j
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center">
            <Sparkline
              values={reportSeries}
              width={240}
              height={60}
              id={`net-${reportRange}`}
              className="text-[var(--accent)]"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Net moyen
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    reportStats.average >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  )}
                >
                  {reportStats.average >= 0 ? "+" : "-"}
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {reportStats.average.toFixed(0)} kcal
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Total net
                </p>
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)]">
                  {reportRange}j
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {reportStats.total.toFixed(0)} kcal
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Mini / Maxi
                </p>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                  net
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {reportStats.min.toFixed(0)} / {reportStats.max.toFixed(0)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Poids
                </p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    reportWeightDelta === null
                      ? "bg-white/80 text-[var(--muted)]"
                      : reportWeightDelta >= 0
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {reportWeightDelta === null ? "n/a" : "7j"}
                </span>
              </div>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {reportWeightDelta === null
                  ? "--"
                  : `${reportWeightDelta >= 0 ? "+" : "-"}${Math.abs(
                      reportWeightDelta
                    ).toFixed(1)} kg`}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/70 px-4 py-3 text-sm text-[var(--foreground)]">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Insight
            </span>
            <p className="mt-2">{reportInsight}</p>
          </div>
        </div>
      </Card>

      {showStats ? (
        <div className="grid w-full grid-cols-2 gap-3">
          {[
            {
              label: "Repas",
              value: `+${totals.mealTotal.toFixed(0)}`,
              color: "text-orange-600",
            },
            {
              label: "Sport",
              value: `-${totals.activityTotal.toFixed(0)}`,
              color: "text-sky-600",
            },
            {
              label: "Net",
              value: `${totals.net.toFixed(0)}`,
              color: "text-[var(--foreground)]",
            },
            {
              label: "Delta",
              value: `${formatSigned(delta)}`,
              color: delta > 0 ? "text-red-600" : "text-emerald-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {item.label}
              </p>
              <p className={cn("mt-2 text-lg font-semibold", item.color)}>
                {item.value} kcal
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {showWeightEquivalent ? (
        <Card className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Equivalent poids
          </p>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {weightKg >= 0 ? "+" : "-"}
            {Math.abs(weightKg).toFixed(2)} kg · {weightG >= 0 ? "+" : "-"}
            {Math.abs(weightG).toFixed(0)} g
          </p>
          <p className="text-[11px] text-[var(--muted)]">est.</p>
        </Card>
      ) : null}

      <button
        type="button"
        aria-label="Ouvrir le menu"
        className="fixed bottom-6 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-white shadow-[0_18px_40px_rgba(12,141,133,0.35)] transition-transform duration-300 hover:scale-[1.03]"
        onClick={() => {
          openSheet();
          setSheetView("menu");
        }}
      >
        <span className="absolute inset-0 rounded-full bg-[var(--accent)]/30 animate-ping" />
        <span className="relative">+</span>
      </button>

      {sheetOpen && mounted ? createPortal(sheetContent, document.body) : null}
    </div>
  );
}
