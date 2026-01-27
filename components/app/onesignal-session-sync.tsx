"use client";

import { useEffect } from "react";
import { getSubscriptionId, initOneSignal, isPushEnabled, loginOneSignal } from "@/src/lib/onesignal";
import { getPushDeviceInfo } from "@/src/lib/push/device";

type OneSignalSessionSyncProps = {
  userId: string;
  appId: string;
  safariWebId: string;
};

export function OneSignalSessionSync({
  userId,
  appId,
  safariWebId,
}: OneSignalSessionSyncProps) {
  useEffect(() => {
    if (!userId || !appId) {
      return;
    }

    const sync = async () => {
      const initResult = await initOneSignal({
        appId,
        safari_web_id: safariWebId || undefined,
        notifyButton: { enable: true },
      });
      if (!initResult.ok) {
        return;
      }

      await loginOneSignal(userId, { appId, safari_web_id: safariWebId });
      const enabled = await isPushEnabled({ appId, safari_web_id: safariWebId });
      if (!enabled) {
        return;
      }
      const subscriptionId = await getSubscriptionId({
        appId,
        safari_web_id: safariWebId,
      });
      if (!subscriptionId) {
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
    };

    void sync();
  }, [appId, safariWebId, userId]);

  return null;
}
