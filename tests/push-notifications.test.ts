import assert from "node:assert/strict";
import test from "node:test";
import { upsertSubscription } from "../src/lib/push/subscribe-handler";
import { sendTestNotification } from "../src/lib/push/send-test";
import { validateSubscriptionInput } from "../src/lib/push/subscriptions";

test("validateSubscriptionInput rejects missing fields", () => {
  const result = validateSubscriptionInput({ platform: "web" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "subscriptionId and platform are required");
  }
});

test("upsertSubscription writes expected fields", async () => {
  let upsertPayload: any = null;
  const supabase = {
    from: () => ({
      upsert: async (values: Record<string, unknown>) => {
        upsertPayload = values;
        return { error: null };
      },
    }),
  };

  const result = await upsertSubscription(supabase, "user-123", {
    subscriptionId: "sub-456",
    platform: "web",
    deviceType: "web",
    userAgent: "UA",
    isEnabled: true,
  });

  assert.equal(result.ok, true);
  if (!upsertPayload) {
    throw new Error("Missing upsert payload");
  }
  assert.equal(upsertPayload.user_id, "user-123");
  assert.equal(upsertPayload.onesignal_subscription_id, "sub-456");
  assert.equal(upsertPayload.external_user_id, "user-123");
  assert.equal(upsertPayload.is_enabled, true);
});

test("sendTestNotification posts to OneSignal and inserts notification", async () => {
  let fetchCalled = false;
  let insertPayload: any = null;
  const supabase = {
    from: () => ({
      insert: async (values: Record<string, unknown>) => {
        insertPayload = values;
        return { error: null };
      },
    }),
  };

  const fetchFn = async () => {
    fetchCalled = true;
    return {
      ok: true,
      json: async () => ({}),
    } as Response;
  };

  const result = await sendTestNotification({
    supabase,
    fetchFn,
    userId: "user-abc",
    appId: "app-id",
    apiKey: "api-key",
    payload: { title: "Hello", body: "World", url: "/app/notifications" },
  });

  assert.equal(result.ok, true);
  assert.equal(fetchCalled, true);
  if (!insertPayload) {
    throw new Error("Missing insert payload");
  }
  assert.equal(insertPayload.user_id, "user-abc");
});

test("sendTestNotification handles OneSignal errors", async () => {
  const supabase = {
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  };

  const fetchFn = async () =>
    ({
      ok: false,
      json: async () => ({ error: "fail" }),
    }) as Response;

  const result = await sendTestNotification({
    supabase,
    fetchFn,
    userId: "user-abc",
    appId: "app-id",
    apiKey: "api-key",
    payload: {},
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "fail");
  }
});
