import { redirect } from "next/navigation";
import AuthPanels from "./auth-panels";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export default async function AuthPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/app");
  }

  return <AuthPanels />;
}
