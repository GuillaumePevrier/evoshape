import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type Payload = {
  subscriptionId?: string;
  platform?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const subscriptionId = String(payload.subscriptionId ?? "").trim();
  const platform = payload.platform ? String(payload.platform).trim() : "";

  if (!subscriptionId || !platform) {
    return NextResponse.json(
      { error: "subscriptionId and platform are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: authData.user.id,
      onesignal_subscription_id: subscriptionId,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,onesignal_subscription_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
