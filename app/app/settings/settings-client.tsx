"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getSubscriptionId,
  hasOneSignalAppId,
  initOneSignal,
  optOutNotifications,
  requestNotifications,
} from "@/src/lib/onesignal";

type Status = "unknown" | "subscribed" | "unsubscribed";

export default function SettingsClient() {
  const [status, setStatus] = useState<Status>(
    hasOneSignalAppId ? "unsubscribed" : "unknown"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    setMessage(null);
    const initResult = await initOneSignal();
    if (!initResult.ok) {
      setMessage("OneSignal n'est pas configure.");
      setLoading(false);
      return;
    }

    const requestResult = await requestNotifications();
    if (!requestResult.ok) {
      setMessage("Impossible d'activer les notifications.");
      setLoading(false);
      return;
    }

    const subscriptionId = await getSubscriptionId();
    if (!subscriptionId) {
      setMessage("Abonnement introuvable apres activation.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId,
        platform: "web",
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(payload?.error ?? "Sauvegarde impossible.");
      setLoading(false);
      return;
    }

    setStatus("subscribed");
    setMessage("Notifications activees.");
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage(null);
    const result = await optOutNotifications();
    if (!result.ok) {
      setMessage("Impossible de desactiver pour le moment.");
      setLoading(false);
      return;
    }
    setStatus("unsubscribed");
    setMessage("Notifications desactivees.");
    setLoading(false);
  };

  const statusLabel =
    status === "subscribed"
      ? "Active"
      : status === "unsubscribed"
        ? "Inactive"
        : "Inconnu";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parametres"
        description="Notifications et preferences essentielles."
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Notifications
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Active les rappels pour rester constant.
            </p>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
            {statusLabel}
          </span>
        </div>

        {!hasOneSignalAppId ? (
          <p className="text-sm text-[var(--muted)]">
            OneSignal n&apos;est pas configure. Ajoute
            `NEXT_PUBLIC_ONESIGNAL_APP_ID` pour activer cette option.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleEnable}
            disabled={!hasOneSignalAppId || loading || status === "subscribed"}
          >
            {loading && status !== "subscribed" ? "Activation..." : "Activer"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDisable}
            disabled={!hasOneSignalAppId || loading || status !== "subscribed"}
          >
            Desactiver
          </Button>
        </div>

        {message ? (
          <p className="text-sm text-[var(--muted)]">{message}</p>
        ) : null}
      </Card>
    </div>
  );
}
