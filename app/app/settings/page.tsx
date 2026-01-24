import SettingsClient from "./settings-client";

export default function SettingsPage() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
  const safariWebId = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID ?? "";
  return <SettingsClient appId={appId} safariWebId={safariWebId} />;
}
