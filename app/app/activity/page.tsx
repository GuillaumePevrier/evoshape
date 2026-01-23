import ActivityClient from "./activity-client";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getISODate } from "@/lib/date";

export default async function ActivityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "";
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, activity_type, duration_min, calories_burned")
    .eq("recorded_at", getISODate())
    .order("created_at", { ascending: false });

  return <ActivityClient userId={userId} initialLogs={logs ?? []} />;
}
