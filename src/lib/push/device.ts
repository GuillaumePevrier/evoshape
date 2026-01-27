export type PushDeviceInfo = {
  deviceType: "web";
  platform: string;
  userAgent: string;
};

export const getPushDeviceInfo = (): PushDeviceInfo => {
  if (typeof navigator === "undefined") {
    return { deviceType: "web", platform: "unknown", userAgent: "unknown" };
  }

  return {
    deviceType: "web",
    platform: navigator.platform || "unknown",
    userAgent: navigator.userAgent || "unknown",
  };
};

export const getNotificationSupport = () => {
  const notificationsSupported = typeof Notification !== "undefined";
  const serviceWorkerSupported =
    typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const isIos =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari =
    typeof navigator !== "undefined" &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any)?.standalone === true);

  return {
    notificationsSupported,
    serviceWorkerSupported,
    isIos,
    isSafari,
    isStandalone,
  };
};

export const detectPrivateMode = async () => {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, 800);

    const request = indexedDB.open("evoshape-private-test");

    request.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(true);
    };

    request.onsuccess = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      request.result.close();
      indexedDB.deleteDatabase("evoshape-private-test");
      resolve(false);
    };
  });
};
