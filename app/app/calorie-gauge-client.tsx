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

type WheelAction = {
  id: SheetView | "profile" | "notifications" | "settings";
  label: string;
  helper?: string;
  type: "sheet" | "route";
  href?: string;
};

type UndoState =
  | {
      type: "meal";
      item: MealLog;
    }
  | {
      type: "activity";
      item: ActivityLog;
    }
  | null;

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
    type: "sheet",
  },
  {
    id: "activity",
    label: "Ajouter activite",
    helper: "Calories brulees",
    type: "sheet",
  },
  {
    id: "weight",
    label: "Ajouter poids",
    helper: "Poids du jour",
    type: "sheet",
  },
  {
    id: "reports",
    label: "Rapports",
    helper: "7 & 30 jours",
    type: "sheet",
  },
  {
    id: "profile",
    label: "Profil",
    helper: "Objectifs & profil",
    type: "route",
    href: "/app/profile",
  },
  {
    id: "settings",
    label: "Parametres",
    helper: "Preferences",
    type: "route",
    href: "/app/settings",
  },
  {
    id: "notifications",
    label: "Notifications",
    helper: "Messages & alertes",
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
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [reportRange, setReportRange] = useState<"7" | "30">("7");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [quickPulseKey, setQuickPulseKey] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState>(null);
  const [undoBusy, setUndoBusy] = useState(false);

  const dragStart = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const dragFrame = useRef<number | null>(null);
  const undoTimer = useRef<number | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!quickPulseKey) return;
    const timeout = window.setTimeout(() => setQuickPulseKey(null), 500);
    return () => window.clearTimeout(timeout);
  }, [quickPulseKey]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) {
        window.clearTimeout(undoTimer.current);
      }
    };
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
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date());

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
    setSheetExpanded(false);
    setSheetOpen(true);
    requestAnimationFrame(() => setSheetVisible(true));
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setSheetView("menu");
    setSheetOffset(0);
    setIsDragging(false);
    setActiveActionId(null);
    setSheetExpanded(false);
    window.setTimeout(() => setSheetOpen(false), 220);
  };

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  };

  const queueUndo = (state: UndoState) => {
    if (!state) return;
    setUndoState(state);
    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current);
    }
    undoTimer.current = window.setTimeout(() => {
      setUndoState(null);
    }, 6000);
  };

  const handleUndo = async () => {
    if (!undoState || !userId) return;
    setUndoBusy(true);
    const supabase = createSupabaseBrowserClient();
    if (undoState.type === "meal") {
      const item = undoState.item;
      await supabase.from("meal_logs").insert({
        user_id: userId,
        recorded_at: item.recorded_at,
        meal_type: item.meal_type,
        name: item.name,
        calories: item.calories ?? 0,
      });
      await refreshMeals();
    } else {
      const item = undoState.item;
      await supabase.from("activity_logs").insert({
        user_id: userId,
        recorded_at: item.recorded_at,
        activity_type: item.activity_type ?? "Activite",
        duration_min: item.duration_min ?? 0,
        calories_burned: item.calories_burned ?? 0,
      });
      await refreshActivities();
    }
    setUndoState(null);
    setUndoBusy(false);
  };

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusFirst = () => {
      const focusables = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      focusables?.[0]?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusables = sheetRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(focusFirst);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      const fallback = openerRef.current ?? lastFocusedRef.current;
      fallback?.focus();
    };
  }, [sheetOpen, closeSheet]);

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
    const target = mealLogs.find((item) => item.id === id) ?? null;
    if (target) {
      setMealLogs((prev) => prev.filter((item) => item.id !== id));
    }
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setClientError(deleteError.message);
      if (target) {
        await refreshMeals();
      }
      return;
    }
    await refreshMeals();
    if (target) {
      queueUndo({ type: "meal", item: target });
    }
  };

  const handleDeleteActivity = async (id: number) => {
    setClientError(null);
    const target = activityLogs.find((item) => item.id === id) ?? null;
    if (target) {
      setActivityLogs((prev) => prev.filter((item) => item.id !== id));
    }
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("activity_logs")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setClientError(deleteError.message);
      if (target) {
        await refreshActivities();
      }
      return;
    }
    await refreshActivities();
    if (target) {
      queueUndo({ type: "activity", item: target });
    }
  };

  const handleAction = (action: WheelAction) => {
    setActiveActionId(action.id);
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
    dragDelta.current = 0;
    setIsDragging(true);
  };

  const handleSheetDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    const deltaY = event.clientY - dragStart.current;
    dragDelta.current = deltaY;
    if (dragFrame.current) {
      cancelAnimationFrame(dragFrame.current);
    }
    dragFrame.current = requestAnimationFrame(() => {
      const clamped = Math.max(-120, Math.min(deltaY, 240));
      setSheetOffset(clamped);
    });
  };

  const handleSheetDragEnd = () => {
    const deltaY = dragDelta.current;
    if (deltaY > 140) {
      closeSheet();
      return;
    }
    if (deltaY < -80) {
      setSheetExpanded(true);
    } else if (deltaY > 60 && sheetExpanded) {
      setSheetExpanded(false);
    }
    if (sheetOffset !== 0) {
      setSheetOffset(0);
    }
    setIsDragging(false);
    dragStart.current = null;
    if (dragFrame.current) {
      cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
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
          "sheet-pop w-full max-w-md overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(17,16,14,0.25)] transition-[transform,max-height] duration-500",
          sheetExpanded ? "max-h-[92vh]" : "max-h-[70vh]"
        )}
        style={{
          transform: `translateY(${sheetOffset + (sheetVisible ? 0 : 24)}px)`,
          transitionTimingFunction: isDragging
            ? "linear"
            : "cubic-bezier(0.16, 1, 0.3, 1)",
          transitionDuration: isDragging ? "0ms" : "420ms",
          willChange: "transform",
        }}
        onClick={(event) => event.stopPropagation()}
        id="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        ref={sheetRef}
        tabIndex={-1}
      >
        <div className="sticky top-0 z-10 rounded-3xl bg-[var(--surface)]/95 px-5 pb-3 pt-4 backdrop-blur">
            <div
              className="mx-auto mb-3 h-2 w-14 rounded-full bg-[var(--border)]"
              role="presentation"
              onPointerDown={handleSheetDragStart}
              onPointerMove={handleSheetDragMove}
              onPointerUp={handleSheetDragEnd}
              onPointerCancel={handleSheetDragEnd}
              style={{ touchAction: "none" }}
            />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {sheetView === "menu" ? "Actions rapides" : "Suivi"}
              </p>
              <p
                id="sheet-title"
                className="text-base font-semibold text-[var(--foreground)]"
              >
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSheetExpanded((prev) => !prev)}
                >
                  {sheetExpanded ? "Reduire" : "Agrandir"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={closeSheet}
                >
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </div>

        {sheetView === "menu" ? (
          <div className="fade-slide-in space-y-4 px-5 pb-5 pt-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Actions
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {wheelActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border bg-white/70 px-3 py-3 text-left text-sm font-semibold text-[var(--foreground)] transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm",
                      activeActionId === action.id
                        ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
                        : "border-[var(--border)]"
                    )}
                    onClick={() => handleAction(action)}
                    onFocus={() => setActiveActionId(action.id)}
                    aria-pressed={activeActionId === action.id}
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
            </div>

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
    <div className="relative space-y-4 pb-24">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Aujourd&apos;hui
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{todayLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Objectif ajuste
          </p>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {targetData.adjustedTarget.toFixed(0)} kcal
          </p>
          <p className="text-[10px] text-[var(--muted)]">avec le sport</p>
          <button
            type="button"
            className="rounded-2xl border border-[var(--border)] bg-white/70 px-2 py-1 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={() =>
              setReportRange((current) => (current === "7" ? "30" : "7"))
            }
            aria-label="Basculer la tendance 7 ou 30 jours"
          >
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              <span>Tendance</span>
              <span>{reportRange}j</span>
            </div>
            <Sparkline
              values={reportSeries}
              width={120}
              height={36}
              id={`net-mini-${reportRange}`}
              className="text-[var(--accent)]"
              showArea={false}
              showBaseline={false}
              showLastDot={false}
            />
          </button>
        </div>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {clientError ? <p className="text-sm text-red-600">{clientError}</p> : null}

      {!targetData.hasCore ? (
        <Card className="border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm text-amber-800">
            Complete ton profil (sexe, taille, age, poids) pour un objectif
            ajuste plus precis.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-col items-center gap-4">
          <CalorieGauge
            consumed={totals.mealTotal}
            burned={totals.activityTotal}
            target={targetData.adjustedTarget}
            net={totals.net}
          />
          <p className="text-xs text-[var(--muted)]">
            Objectif de base {targetData.baseTarget.toFixed(0)} kcal · ajuste
            avec le sport
          </p>
          {trendDelta !== null ? (
            <div className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              {trendDelta >= 0 ? "+" : "-"}
              {Math.abs(trendDelta).toFixed(0)} kcal vs hier
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Actions rapides
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Repas
          </span>
          {QUICK_MEALS.slice(0, 2).map((calories) => (
            <Button
              key={`meal-${calories}`}
              type="button"
              size="sm"
              variant="soft"
              disabled={saving}
              className={cn(
                "transition",
                quickPulseKey === `meal-${calories}` ? "quick-pulse" : ""
              )}
              onClick={() => {
                setQuickPulseKey(`meal-${calories}`);
                triggerHaptic();
                handleAddMeal({ calories });
              }}
            >
              +{calories}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Sport
          </span>
          {QUICK_ACTIVITIES.slice(0, 2).map((activity) => (
            <Button
              key={`activity-${activity.label}`}
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              className={cn(
                "transition",
                quickPulseKey === `activity-${activity.label}`
                  ? "quick-pulse"
                  : ""
              )}
              onClick={() =>
                (() => {
                  setQuickPulseKey(`activity-${activity.label}`);
                  triggerHaptic();
                  handleAddActivity({
                    calories: activity.calories,
                    type: activity.label,
                  });
                })()
              }
            >
              {activity.label} -{activity.calories}
            </Button>
          ))}
        </div>
      </Card>

      {!hasLogs ? (
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

      <Card className="space-y-3">
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
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)]/70 px-4 py-3 text-sm text-[var(--foreground)]">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Insight
          </span>
          <p className="mt-2">{reportInsight}</p>
        </div>
      </Card>

      <Card className="grid gap-2 sm:grid-cols-2">
        {[
          {
            label: "Objectif",
            value: `${targetData.adjustedTarget.toFixed(0)} kcal`,
            tone: "text-[var(--foreground)]",
          },
          {
            label: "Consommees",
            value: `${totals.mealTotal.toFixed(0)} kcal`,
            tone: "text-orange-600",
          },
          {
            label: "Brulees",
            value: `${totals.activityTotal.toFixed(0)} kcal`,
            tone: "text-sky-600",
          },
          {
            label: "Delta",
            value: `${formatSigned(delta)} kcal`,
            tone: delta > 0 ? "text-red-600" : "text-emerald-600",
          },
        ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2.5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                {item.label}
              </p>
              <p className={cn("mt-2 text-lg font-semibold", item.tone)}>
                {item.value}
              </p>
            </div>
          ))}
      </Card>

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

      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={sheetOpen}
        aria-controls="bottom-sheet"
        className="fixed bottom-6 left-1/2 z-40 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_18px_40px_rgba(12,141,133,0.35)] transition-transform duration-300 hover:scale-[1.03]"
        onClick={() => {
          openSheet();
          setSheetView("menu");
        }}
        ref={openerRef}
      >
        <span className="absolute inset-0 rounded-full bg-[var(--accent)]/30 animate-ping" />
        <div className="relative flex flex-col items-center leading-none">
          <span className="text-lg font-semibold">
            {formatSigned(totals.net)}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em]">kcal</span>
        </div>
        <span className="absolute -top-1 right-0 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-strong)] shadow">
          +
        </span>
      </button>

      {undoState ? (
        <div className="fixed bottom-24 left-1/2 z-40 w-[min(92vw,360px)] -translate-x-1/2">
          <div className="undo-pop flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3 text-sm shadow-[0_18px_40px_rgba(17,16,14,0.18)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Suppression
              </p>
              <p className="text-[var(--foreground)]">
                {undoState.type === "meal" ? "Repas supprime" : "Activite supprimee"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={undoBusy}
              onClick={handleUndo}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {sheetOpen && mounted ? createPortal(sheetContent, document.body) : null}
    </div>
  );
}
