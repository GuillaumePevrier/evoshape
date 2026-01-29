import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OneSignalSessionSync } from "@/components/app/onesignal-session-sync";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import EnvFallback from "./env-fallback";
import { getSupabaseServerEnvStatus, logMissingServerEnv } from "@/src/lib/env/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const envStatus = getSupabaseServerEnvStatus();
  if (!envStatus.ok) {
    logMissingServerEnv("app/layout", envStatus.missing);
    return (
      <div className="min-h-screen">
        <EnvFallback missing={envStatus.missing} />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth");
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
  const safariWebId = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID ?? "";

  return (
    <div className="min-h-screen">
      <OneSignalSessionSync
        userId={data.user.id}
        appId={appId}
        safariWebId={safariWebId}
      />
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 pt-6">
        <Link href="/app" className="flex items-center">
          <Logo size="lg" showBackground={false} showLabel={false} />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 pb-24 pt-6">
        {children}
      </main>
    </div>
  );
}
