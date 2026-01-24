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

type OneSignalInitOptions = {
  appId: string;
  safari_web_id?: string;
  notifyButton?: {
    enable: boolean;
  };
};

type OneSignalSDK = {
  init?: (options: OneSignalInitOptions) => Promise<void> | void;
  Notifications?: {
    requestPermission?: () => Promise<void>;
    setSubscription?: (value: boolean) => Promise<void>;
  };
  User?: {
    PushSubscription?: {
      id?: string;
      optedIn?: boolean;
      optIn?: () => Promise<void>;
      optOut?: () => Promise<void>;
    };
  };
  getUserId?: () => Promise<string | null>;
};

type OneSignalDeferred = Array<(oneSignal: OneSignalSDK) => void>;

let oneSignalInstance: OneSignalSDK | null = null;

const getOneSignalDeferred = (): OneSignalDeferred | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as typeof window & {
    OneSignalDeferred?: OneSignalDeferred;
  };
  if (!win.OneSignalDeferred) {
    win.OneSignalDeferred = [];
  }
  return win.OneSignalDeferred;
};

const getOneSignalInstance = (): OneSignalSDK | null => {
  if (oneSignalInstance) {
    return oneSignalInstance;
  }
  if (typeof window === "undefined") {
    return null;
  }
  return (
    (window as typeof window & { OneSignal?: OneSignalSDK }).OneSignal ?? null
  );
};

const resolveAppId = (appIdOverride?: string) => {
  if (appIdOverride) {
    return appIdOverride;
  }
  return process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
};

const buildInitOptions = (options?: Partial<OneSignalInitOptions>) => {
  const appId = resolveAppId(options?.appId);
  const initOptions: OneSignalInitOptions = { appId };

  if (options?.safari_web_id) {
    initOptions.safari_web_id = options.safari_web_id;
  }
  if (options?.notifyButton) {
    initOptions.notifyButton = options.notifyButton;
  }

  return initOptions;
};

let initializedAppId: string | null = null;

export const initOneSignal = async (
  options?: Partial<OneSignalInitOptions>
): Promise<InitResult> => {
  const initOptions = buildInitOptions(options);
  if (!initOptions.appId) {
    return { ok: false, reason: "missing-app-id" };
  }

  if (initialized && initializedAppId === initOptions.appId) {
    return { ok: true };
  }

  if (initializedAppId && initializedAppId !== initOptions.appId) {
    initialized = false;
    initPromise = null;
    initializedAppId = null;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await loadScript();
        const deferred = getOneSignalDeferred();
        if (!deferred) {
          return { ok: false, reason: "sdk-unavailable" };
        }
        return await new Promise<InitResult>((resolve) => {
          let settled = false;
          const finalize = (result: InitResult) => {
            if (settled) {
              return;
            }
            settled = true;
            resolve(result);
          };
          const timeoutId = setTimeout(() => {
            finalize({ ok: false, reason: "sdk-timeout" });
          }, 8000);
          deferred.push(async (OneSignal) => {
            oneSignalInstance = OneSignal;
            try {
              if (!OneSignal?.init) {
                clearTimeout(timeoutId);
                finalize({ ok: false, reason: "sdk-unavailable" });
                return;
              }
              await OneSignal.init(initOptions);
              initialized = true;
              initializedAppId = initOptions.appId;
              clearTimeout(timeoutId);
              finalize({ ok: true });
            } catch {
              clearTimeout(timeoutId);
              finalize({ ok: false, reason: "sdk-init-failed" });
            }
          });
        });
      } catch {
        return { ok: false, reason: "sdk-load-failed" };
      }
    })();
  }

  return initPromise;
};

export const subscribeToPush = async (options?: Partial<OneSignalInitOptions>) => {
  const initResult = await initOneSignal(options);
  if (!initResult.ok) {
    return initResult;
  }

  const OneSignal = getOneSignalInstance();
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

export const unsubscribeFromPush = async (
  options?: Partial<OneSignalInitOptions>
) => {
  const initResult = await initOneSignal(options);
  if (!initResult.ok) {
    return initResult;
  }

  const OneSignal = getOneSignalInstance();
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

export const getSubscriptionId = async (
  options?: Partial<OneSignalInitOptions>
) => {
  const initResult = await initOneSignal(options);
  if (!initResult.ok) {
    return null;
  }

  const OneSignal = getOneSignalInstance();
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

export const isPushEnabled = async (options?: Partial<OneSignalInitOptions>) => {
  const initResult = await initOneSignal(options);
  if (!initResult.ok) {
    return false;
  }

  const OneSignal = getOneSignalInstance();
  if (!OneSignal) {
    return false;
  }

  if (typeof OneSignal.User?.PushSubscription?.optedIn === "boolean") {
    return OneSignal.User.PushSubscription.optedIn;
  }

  if (typeof OneSignal.User?.PushSubscription?.id === "string") {
    return OneSignal.User.PushSubscription.id.length > 0;
  }

  return false;
};
