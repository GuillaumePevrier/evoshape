import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { sendTestNotification } from "@/src/lib/push/send-test";

type Payload = {
  title?: string;
  body?: string;
  url?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
  const apiKey = process.env.ONESIGNAL_REST_API_KEY ?? "";

  if (!appId || !apiKey) {
    return NextResponse.json(
      { error: "OneSignal server env missing" },
      { status: 500 }
    );
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const result = await sendTestNotification({
    supabase,
    fetchFn: fetch,
    userId: authData.user.id,
    appId,
    apiKey,
    payload,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
