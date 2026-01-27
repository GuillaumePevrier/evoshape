type Payload = {
  title?: string;
  body?: string;
  url?: string;
};

const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

export const sendTestNotification = async ({
  supabase,
  fetchFn,
  userId,
  appId,
  apiKey,
  payload,
}: {
  supabase: {
    from: (table: string) => {
      insert: (
        values: Record<string, unknown>
      ) => PromiseLike<{ error: unknown }>;
    };
  };
  fetchFn: typeof fetch;
  userId: string;
  appId: string;
  apiKey: string;
  payload: Payload;
}) => {
  const title = payload.title?.trim() || "EvoShape";
  const body = payload.body?.trim() || "Notification de test";
  const url = payload.url?.trim() || "/app/notifications";

  const response = await fetchFn(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_external_user_ids: [userId],
      headings: { en: title, fr: title },
      contents: { en: body, fr: body },
      url,
    }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { errors?: string[]; error?: string }
      | null;
    return {
      ok: false,
      error:
        errorPayload?.error ??
        errorPayload?.errors?.join(", ") ??
        "OneSignal request failed",
    };
  }

  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    url,
    source: "onesignal",
  });

  return { ok: true };
};
