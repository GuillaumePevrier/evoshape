import WeightClient from "./weight-client";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function WeightPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "";
  const { data: entries } = await supabase
    .from("weights")
    .select("id, recorded_at, weight_kg")
    .order("recorded_at", { ascending: false });

  return <WeightClient userId={userId} initialEntries={entries ?? []} />;
}
