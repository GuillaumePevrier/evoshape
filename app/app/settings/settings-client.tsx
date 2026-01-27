"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getSubscriptionId,
  initOneSignal,
  isPushEnabled,
  loginOneSignal,
  subscribeToPush,
  logoutOneSignal,
  unsubscribeFromPush,
} from "@/src/lib/onesignal";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { getNotificationSupport, getPushDeviceInfo } from "@/src/lib/push/device";

type Status = "unknown" | "subscribed" | "unsubscribed";

type SettingsClientProps = {
  appId: string;
  safariWebId: string;
  debugEnabled: boolean;
};

export default function SettingsClient({
  appId,
  safariWebId,
  debugEnabled,
}: SettingsClientProps) {
  const isConfigured = Boolean(appId);
  const [status, setStatus] = useState<Status>(
    isConfigured ? "unsubscribed" : "unknown"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [support, setSupport] = useState<{
    notifications: boolean;
    serviceWorker: boolean;
  }>({ notifications: true, serviceWorker: true });
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [userId, setUserId] = useState<string>("");
  const [diagnostics, setDiagnostics] = useState<{
    scriptPresent: boolean;
    oneSignalPresent: boolean;
    deferredPresent: boolean;
    deferredLength: number;
    serviceWorkerSupported: boolean;
    serviceWorkerRegistered: boolean;
    serviceWorkerScript: string | null;
    permission: NotificationPermission | "unsupported";
  } | null>(null);

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
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    const enabled = await isPushEnabled(initOptions());
    setStatus(enabled ? "subscribed" : "unsubscribed");
  }, [initOptions, isConfigured]);

  useEffect(() => {
    const supportInfo = getNotificationSupport();
    setSupport({
      notifications: supportInfo.notificationsSupported,
      serviceWorker: supportInfo.serviceWorkerSupported,
    });
    setPermission(
      supportInfo.notificationsSupported ? Notification.permission : "unsupported"
    );
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }
    void refreshStatus();
  }, [isConfigured, refreshStatus]);

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }
    let cancelled = false;
    const scriptPresent = Boolean(
      document.querySelector(
        'script[src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"]'
      )
    );
    const deferredQueue = (
      window as Window & { OneSignalDeferred?: unknown[] }
    ).OneSignalDeferred;
    const deferredPresent = Array.isArray(deferredQueue);
    const deferredLength = deferredQueue?.length ?? 0;
    const oneSignalPresent = Boolean(
      (window as Window & { OneSignal?: unknown }).OneSignal
    );
    const serviceWorkerSupported =
      typeof navigator !== "undefined" && "serviceWorker" in navigator;
    const permissionValue =
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission;
    if (!serviceWorkerSupported) {
      setDiagnostics({
        scriptPresent,
        oneSignalPresent,
        deferredPresent,
        deferredLength,
        serviceWorkerSupported: false,
        serviceWorkerRegistered: false,
        serviceWorkerScript: null,
        permission: permissionValue,
      });
      return;
    }
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        const matching = registrations.find((registration) => {
          const urls = [
            registration.active?.scriptURL,
            registration.waiting?.scriptURL,
            registration.installing?.scriptURL,
          ].filter(Boolean) as string[];
          return urls.some((url) => url.includes("OneSignalSDKWorker.js"));
        });
        if (cancelled) {
          return;
        }
        setDiagnostics({
          scriptPresent,
          oneSignalPresent,
          deferredPresent,
          deferredLength,
          serviceWorkerSupported: true,
          serviceWorkerRegistered: Boolean(matching),
          serviceWorkerScript: matching?.active?.scriptURL ?? null,
          permission: permissionValue,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setDiagnostics({
          scriptPresent,
          oneSignalPresent,
          deferredPresent,
          deferredLength,
          serviceWorkerSupported: true,
          serviceWorkerRegistered: false,
          serviceWorkerScript: null,
          permission: permissionValue,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [debugEnabled]);

  const handleEnable = async () => {
    setLoading(true);
    setMessage(null);
    const initResult = await initOneSignal(initOptions());
    if (!initResult.ok) {
      if (initResult.reason === "missing-app-id") {
        setMessage("OneSignal n'est pas configure.");
      } else if (initResult.reason === "sdk-load-failed") {
        setMessage(
          "Impossible de charger OneSignal (SDK bloque ou CSP). Verifie les bloqueurs."
        );
      } else if (initResult.reason === "sdk-timeout") {
        setMessage("OneSignal ne repond pas apres chargement.");
      } else if (initResult.reason === "sdk-init-failed") {
        setMessage("Echec d'initialisation OneSignal.");
      } else {
        setMessage("OneSignal SDK indisponible apres chargement.");
      }
      setLoading(false);
      return;
    }

    if (userId) {
      const loginResult = await loginOneSignal(userId, initOptions());
      if (!loginResult.ok) {
        setMessage("Impossible de lier le compte OneSignal.");
        setLoading(false);
        return;
      }
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

    const deviceInfo = getPushDeviceInfo();
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId,
        platform: deviceInfo.platform,
        deviceType: deviceInfo.deviceType,
        userAgent: deviceInfo.userAgent,
        isEnabled: true,
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
    const subscriptionId = await getSubscriptionId(initOptions());
    const result = await unsubscribeFromPush(initOptions());
    if (!result.ok) {
      setMessage("Impossible de desactiver pour le moment.");
      setLoading(false);
      return;
    }
    if (subscriptionId) {
      const deviceInfo = getPushDeviceInfo();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId,
          platform: deviceInfo.platform,
          deviceType: deviceInfo.deviceType,
          userAgent: deviceInfo.userAgent,
          isEnabled: false,
        }),
      });
    }
    if (userId) {
      await logoutOneSignal(initOptions());
    }
    await refreshStatus();
    setMessage("Notifications desactivees.");
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    setMessage(null);
    const initResult = await initOneSignal(initOptions());
    if (!initResult.ok) {
      setMessage("Impossible d'initialiser OneSignal.");
      setLoading(false);
      return;
    }
    if (userId) {
      await loginOneSignal(userId, initOptions());
    }
    const subscriptionId = await getSubscriptionId(initOptions());
    if (!subscriptionId) {
      setMessage("Abonnement introuvable pour la relance.");
      setLoading(false);
      return;
    }
    const deviceInfo = getPushDeviceInfo();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId,
        platform: deviceInfo.platform,
        deviceType: deviceInfo.deviceType,
        userAgent: deviceInfo.userAgent,
        isEnabled: true,
      }),
    });
    await refreshStatus();
    setMessage("Liaison rafraichie.");
    setLoading(false);
  };

  const handleSendTest = async () => {
    setTestLoading(true);
    setMessage(null);
    const response = await fetch("/api/push/send-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "EvoShape",
        body: "Notification de test",
        url: "/app/notifications",
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setMessage(payload?.error ?? "Echec envoi test.");
      setTestLoading(false);
      return;
    }
    setMessage("Notification de test envoyee.");
    setTestLoading(false);
  };

  const statusLabel =
    status === "subscribed"
      ? "Active"
      : status === "unsubscribed"
        ? "Inactive"
        : "Inconnu";
  const isSupported = support.notifications && support.serviceWorker;
  const isPermissionDenied = permission === "denied";
  const supportInfo = getNotificationSupport();

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

        {!isSupported ? (
          <p className="text-sm text-[var(--muted)]">
            Ton navigateur ne supporte pas les notifications push. Essaie un
            navigateur compatible ou consulte{" "}
            <a
              className="underline"
              href="https://documentation.onesignal.com/docs/web-push-quickstart"
              target="_blank"
              rel="noreferrer"
            >
              le guide de compatibilite
            </a>
            .
          </p>
        ) : null}

        {supportInfo.isIos && supportInfo.isSafari ? (
          <p className="text-sm text-[var(--muted)]">
            Sur iOS Safari, les notifications web exigent une PWA installee
            (iOS 16.4+) et ne fonctionnent pas en navigation privee.
          </p>
        ) : null}

        {isPermissionDenied ? (
          <p className="text-sm text-[var(--muted)]">
            Les notifications sont bloquees pour ce site. Dans ton navigateur,
            ouvre les parametres du site et autorise les notifications, puis
            recharge la page.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {status === "subscribed" ? (
            <Button
              variant="outline"
              onClick={handleDisable}
              disabled={!isConfigured || loading || !isSupported}
            >
              {loading ? "Desactivation..." : "Desactiver"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleEnable}
              disabled={!isConfigured || loading || !isSupported}
            >
              {loading ? "Activation..." : "Activer"}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!isConfigured || loading || !isSupported}
          >
            Reinitialiser la liaison
          </Button>
          <Button
            variant="soft"
            onClick={handleSendTest}
            disabled={!isConfigured || testLoading || !isSupported}
          >
            {testLoading ? "Envoi..." : "Envoyer un test"}
          </Button>
        </div>

        {message ? (
          <p className="text-sm text-[var(--muted)]">{message}</p>
        ) : null}
      </Card>

      {debugEnabled ? (
        <Card className="space-y-3" variant="outline">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            OneSignal Debug
          </h3>
          <div className="text-xs text-[var(--muted)]">
            <div>appId: {appId || "--"}</div>
            <div>safariWebId: {safariWebId || "--"}</div>
            <div>
              script loaded: {diagnostics?.scriptPresent ? "yes" : "no"}
            </div>
            <div>
              window.OneSignal: {diagnostics?.oneSignalPresent ? "yes" : "no"}
            </div>
            <div>
              OneSignalDeferred:{" "}
              {diagnostics?.deferredPresent ? "yes" : "no"} (
              {diagnostics?.deferredLength ?? 0})
            </div>
            <div>
              service worker:{" "}
              {diagnostics?.serviceWorkerSupported
                ? diagnostics?.serviceWorkerRegistered
                  ? "registered"
                  : "missing"
                : "unsupported"}
            </div>
            <div>
              worker script: {diagnostics?.serviceWorkerScript ?? "--"}
            </div>
            <div>
              notification permission: {diagnostics?.permission ?? "--"}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
