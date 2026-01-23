import { getISODate } from "@/lib/date";
import DashboardClient from "./dashboard-client";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const today = getISODate();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const start = getISODate(startDate);

  const [
    { data: profile, error: profileError },
    meals,
    activities,
    weights,
  ] = await Promise.all([
    supabase.from("profiles").select("target_calories").maybeSingle(),
    supabase
      .from("meal_logs")
      .select("calories, meal_type, recorded_at")
      .gte("recorded_at", start)
      .lte("recorded_at", today),
    supabase
      .from("activity_logs")
      .select("calories_burned, recorded_at")
      .gte("recorded_at", start)
      .lte("recorded_at", today),
    supabase
      .from("weights")
      .select("weight_kg, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(30),
  ]);

  const errorMessage =
    profileError?.message ??
    meals.error?.message ??
    activities.error?.message ??
    weights.error?.message ??
    null;

  return (
    <DashboardClient
      target={profile?.target_calories ?? 0}
      meals={meals.data ?? []}
      activities={activities.data ?? []}
      weights={weights.data ?? []}
      error={errorMessage}
    />
  );
}
