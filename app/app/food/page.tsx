import FoodClient from "./food-client";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getISODate } from "@/lib/date";

export default async function FoodPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "";

  const today = getISODate();
  const [templates, logs] = await Promise.all([
    supabase
      .from("meal_templates")
      .select("id, name, calories, protein_g, carbs_g, fat_g")
      .order("created_at", { ascending: false }),
    supabase
      .from("meal_logs")
      .select("id, meal_type, name, calories, created_at")
      .eq("recorded_at", today)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <FoodClient
      userId={userId}
      initialTemplates={templates.data ?? []}
      initialLogs={logs.data ?? []}
    />
  );
}
