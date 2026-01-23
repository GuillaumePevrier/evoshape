import ProfileClient from "./profile-client";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "";
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, sex, birth_year, height_cm, target_calories")
    .maybeSingle();

  return <ProfileClient userId={userId} initialProfile={profile} />;
}
