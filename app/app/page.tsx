import { getISODate } from "@/lib/date";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import CalorieGaugeClient from "./calorie-gauge-client";

export default async function CalorieGaugePage() {
  const supabase = await createSupabaseServerClient();
  const today = getISODate();

  const [
    { data: profile, error: profileError },
    { data: meals, error: mealError },
    { data: activities, error: activityError },
    { data: userData },
  ] = await Promise.all([
    supabase.from("profiles").select("target_calories").maybeSingle(),
    supabase
      .from("meal_logs")
      .select("id, name, calories, meal_type, recorded_at, created_at")
      .eq("recorded_at", today)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select(
        "id, activity_type, calories_burned, duration_min, recorded_at, created_at"
      )
      .eq("recorded_at", today)
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const errorMessage =
    profileError?.message ?? mealError?.message ?? activityError?.message ?? null;

  return (
    <CalorieGaugeClient
      userId={userData.user?.id ?? ""}
      target={profile?.target_calories ?? 0}
      meals={meals ?? []}
      activities={activities ?? []}
      error={errorMessage}
    />
  );
}
