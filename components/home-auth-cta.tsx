"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function HomeAuthCta() {
  const router = useRouter();

  return (
    <Button size="lg" className="w-full" onClick={() => router.push("/auth")}>
      Se connecter / Creer un compte
    </Button>
  );
}
