export type SubscriptionPayload = {
  subscriptionId: string;
  platform: string;
  deviceType: string;
  userAgent: string;
  isEnabled: boolean;
};

export type SubscriptionInput = Partial<SubscriptionPayload>;

export type SubscriptionValidationResult =
  | { ok: true; payload: SubscriptionPayload }
  | { ok: false; error: string };

export const validateSubscriptionInput = (
  input: SubscriptionInput
): SubscriptionValidationResult => {
  const subscriptionId = String(input.subscriptionId ?? "").trim();
  const platform = String(input.platform ?? "").trim();
  const deviceType = String(input.deviceType ?? "").trim() || "web";
  const userAgent = String(input.userAgent ?? "").trim();
  const isEnabled =
    typeof input.isEnabled === "boolean" ? input.isEnabled : true;

  if (!subscriptionId || !platform) {
    return {
      ok: false,
      error: "subscriptionId and platform are required",
    };
  }

  return {
    ok: true,
    payload: {
      subscriptionId,
      platform,
      deviceType,
      userAgent,
      isEnabled,
    },
  };
};
