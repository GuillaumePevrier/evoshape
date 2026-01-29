import { redirect } from "next/navigation";
import AuthPanels from "./auth-panels";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getSupabaseServerEnvStatus, logMissingServerEnv } from "@/src/lib/env/server";

export default async function AuthPage() {
  const envStatus = getSupabaseServerEnvStatus();
  if (!envStatus.ok) {
    logMissingServerEnv("auth/page", envStatus.missing);
    return <AuthPanels />;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/app");
  }

  return <AuthPanels />;
}
