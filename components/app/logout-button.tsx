"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { logoutOneSignal } from "@/src/lib/onesignal";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await logoutOneSignal();
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? "Deconnexion..." : "Se deconnecter"}
    </Button>
  );
}
