const ONESIGNAL_SDK_URL =
  "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

type InitResult = { ok: true } | { ok: false; reason: string };

let initPromise: Promise<InitResult> | null = null;
let initialized = false;

const loadScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window-not-available"));
  }

  if (document.querySelector(`script[src="${ONESIGNAL_SDK_URL}"]`)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ONESIGNAL_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("onesignal-sdk-load-failed"));
    document.head.appendChild(script);
  });
};

type OneSignalSDK = {
  init?: (options: {
    appId: string;
    serviceWorkerPath: string;
    serviceWorkerUpdaterPath: string;
  }) => Promise<void> | void;
  Notifications?: {
    requestPermission?: () => Promise<void>;
    setSubscription?: (value: boolean) => Promise<void>;
  };
  User?: {
    PushSubscription?: {
      id?: string;
      optIn?: () => Promise<void>;
      optOut?: () => Promise<void>;
    };
  };
  getUserId?: () => Promise<string | null>;
};

const getOneSignal = (): OneSignalSDK | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as typeof window & { OneSignal?: OneSignalSDK }).OneSignal ?? null;
};

export const hasOneSignalAppId = Boolean(
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
);

export const initOneSignal = async (): Promise<InitResult> => {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    return { ok: false, reason: "missing-app-id" };
  }

  if (initialized) {
    return { ok: true };
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await loadScript();
        const OneSignal = getOneSignal();
        if (!OneSignal?.init) {
          return { ok: false, reason: "sdk-unavailable" };
        }
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/OneSignalSDKWorker.js",
        });
        initialized = true;
        return { ok: true };
      } catch {
        return { ok: false, reason: "sdk-load-failed" };
      }
    })();
  }

  return initPromise;
};

export const requestNotifications = async () => {
  const initResult = await initOneSignal();
  if (!initResult.ok) {
    return initResult;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    return { ok: false, reason: "sdk-unavailable" };
  }

  if (OneSignal.Notifications?.requestPermission) {
    await OneSignal.Notifications.requestPermission();
  }

  if (OneSignal.User?.PushSubscription?.optIn) {
    await OneSignal.User.PushSubscription.optIn();
  }

  return { ok: true };
};

export const optOutNotifications = async () => {
  const initResult = await initOneSignal();
  if (!initResult.ok) {
    return initResult;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    return { ok: false, reason: "sdk-unavailable" };
  }

  if (OneSignal.User?.PushSubscription?.optOut) {
    await OneSignal.User.PushSubscription.optOut();
  } else if (OneSignal.Notifications?.setSubscription) {
    await OneSignal.Notifications.setSubscription(false);
  }

  return { ok: true };
};

export const getSubscriptionId = async () => {
  const initResult = await initOneSignal();
  if (!initResult.ok) {
    return null;
  }

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    return null;
  }

  if (OneSignal.User?.PushSubscription?.id) {
    return OneSignal.User.PushSubscription.id as string;
  }

  if (OneSignal.getUserId) {
    return (await OneSignal.getUserId()) as string | null;
  }

  return null;
};
