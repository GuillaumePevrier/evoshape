import { getISODate } from "@/lib/date";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import CalorieGaugeClient from "./calorie-gauge-client";

export default async function CalorieGaugePage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const today = getISODate(now);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    return getISODate(date);
  });
  const lastThirtyDays = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (29 - index));
    return getISODate(date);
  });
  const startDate = lastThirtyDays[0];

  const [
    { data: profile, error: profileError },
    { data: meals, error: mealError },
    { data: activities, error: activityError },
    { data: weights, error: weightError },
    { data: userData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, sex, birth_year, height_cm, target_calories")
      .maybeSingle(),
    supabase
      .from("meal_logs")
      .select("id, name, calories, meal_type, recorded_at, created_at")
      .gte("recorded_at", startDate)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select(
        "id, activity_type, calories_burned, duration_min, recorded_at, created_at"
      )
      .gte("recorded_at", startDate)
      .order("created_at", { ascending: false }),
    supabase
      .from("weights")
      .select("id, recorded_at, weight_kg")
      .gte("recorded_at", startDate)
      .order("recorded_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const errorMessage =
    profileError?.message ??
    mealError?.message ??
    activityError?.message ??
    weightError?.message ??
    null;

  const mealByDate = (meals ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.recorded_at] = (acc[item.recorded_at] ?? 0) + (item.calories ?? 0);
    return acc;
  }, {});

  const activityByDate = (activities ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.recorded_at] =
        (acc[item.recorded_at] ?? 0) + (item.calories_burned ?? 0);
      return acc;
    },
    {}
  );

  const netSeries7 = lastSevenDays.map(
    (date) => (mealByDate[date] ?? 0) - (activityByDate[date] ?? 0)
  );
  const netSeries30 = lastThirtyDays.map(
    (date) => (mealByDate[date] ?? 0) - (activityByDate[date] ?? 0)
  );

  const todayMeals = (meals ?? []).filter((item) => item.recorded_at === today);
  const todayActivities = (activities ?? []).filter(
    (item) => item.recorded_at === today
  );
  const weightEntries = weights ?? [];
  const latestWeight =
    weightEntries.length > 0
      ? weightEntries[weightEntries.length - 1]
      : null;

  return (
    <CalorieGaugeClient
      userId={userData.user?.id ?? ""}
      profile={profile}
      latestWeight={latestWeight}
      meals={todayMeals}
      activities={todayActivities}
      netSeries7={netSeries7}
      netSeries30={netSeries30}
      weightEntries={weightEntries}
      error={errorMessage}
    />
  );
}
