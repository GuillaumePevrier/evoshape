import { validateSubscriptionInput } from "./subscriptions";

type SubscriptionPayload = {
  subscriptionId?: string;
  platform?: string;
  deviceType?: string;
  userAgent?: string;
  isEnabled?: boolean;
};

export const upsertSubscription = async (
  supabase: {
    from: (table: string) => {
      upsert: (
        values: Record<string, unknown>,
        options: { onConflict: string }
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  },
  userId: string,
  payload: SubscriptionPayload
) => {
  const validation = validateSubscriptionInput({
    subscriptionId: payload.subscriptionId,
    platform: payload.platform,
    deviceType: payload.deviceType,
    userAgent: payload.userAgent,
    isEnabled: payload.isEnabled,
  });

  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  const { subscriptionId, platform, deviceType, userAgent, isEnabled } =
    validation.payload;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      onesignal_subscription_id: subscriptionId,
      platform,
      device_type: deviceType,
      user_agent: userAgent || null,
      is_enabled: isEnabled,
      external_user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,onesignal_subscription_id" }
  );

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, status: 200 };
};
