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
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  return {
    notificationsSupported,
    serviceWorkerSupported,
    isIos,
    isSafari,
  };
};
