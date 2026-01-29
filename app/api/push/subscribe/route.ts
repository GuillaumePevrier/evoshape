import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { upsertSubscription } from "@/src/lib/push/subscribe-handler";
import { getSupabaseServerEnvStatus, logMissingServerEnv } from "@/src/lib/env/server";

type Payload = {
  subscriptionId?: string;
  platform?: string;
  deviceType?: string;
  userAgent?: string;
  isEnabled?: boolean;
};

export async function POST(request: Request) {
  const envStatus = getSupabaseServerEnvStatus();
  if (!envStatus.ok) {
    logMissingServerEnv("api/push/subscribe", envStatus.missing);
    return NextResponse.json(
      { error: "Missing server environment configuration" },
      { status: 500 }
    );
  }

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

  const result = await upsertSubscription(supabase, authData.user.id, payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true }, { status: result.status });
}
