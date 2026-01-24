"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getSubscriptionId,
  initOneSignal,
  isPushEnabled,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/src/lib/onesignal";

type Status = "unknown" | "subscribed" | "unsubscribed";

type SettingsClientProps = {
  appId: string;
  safariWebId: string;
};

export default function SettingsClient({
  appId,
  safariWebId,
}: SettingsClientProps) {
  const isConfigured = Boolean(appId);
  const [status, setStatus] = useState<Status>(
    isConfigured ? "unsubscribed" : "unknown"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initOptions = useCallback(
    () => ({
      appId,
      safari_web_id: safariWebId || undefined,
      notifyButton: { enable: true },
    }),
    [appId, safariWebId]
  );

  const refreshStatus = useCallback(async () => {
    if (!isConfigured) {
      setStatus("unknown");
      return;
    }
    const enabled = await isPushEnabled(initOptions());
    setStatus(enabled ? "subscribed" : "unsubscribed");
  }, [initOptions, isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshStatus();
  }, [isConfigured, refreshStatus]);

  const handleEnable = async () => {
    setLoading(true);
    setMessage(null);
    const initResult = await initOneSignal(initOptions());
    if (!initResult.ok) {
      setMessage(
        initResult.reason === "missing-app-id"
          ? "OneSignal n'est pas configure."
          : "Impossible de charger OneSignal."
      );
      setLoading(false);
      return;
    }

    const requestResult = await subscribeToPush(initOptions());
    if (!requestResult.ok) {
      setMessage("Impossible d'activer les notifications.");
      setLoading(false);
      return;
    }

    const subscriptionId = await getSubscriptionId(initOptions());
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

    await refreshStatus();
    setMessage("Notifications activees.");
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage(null);
    const result = await unsubscribeFromPush(initOptions());
    if (!result.ok) {
      setMessage("Impossible de desactiver pour le moment.");
      setLoading(false);
      return;
    }
    await refreshStatus();
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

        {!isConfigured ? (
          <p className="text-sm text-[var(--muted)]">
            OneSignal n&apos;est pas configure. Ajoute
            `NEXT_PUBLIC_ONESIGNAL_APP_ID` pour activer cette option.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {status === "subscribed" ? (
            <Button
              variant="outline"
              onClick={handleDisable}
              disabled={!isConfigured || loading}
            >
              {loading ? "Desactivation..." : "Desactiver"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleEnable}
              disabled={!isConfigured || loading}
            >
              {loading ? "Activation..." : "Activer"}
            </Button>
          )}
        </div>

        {message ? (
          <p className="text-sm text-[var(--muted)]">{message}</p>
        ) : null}
      </Card>
    </div>
  );
}
