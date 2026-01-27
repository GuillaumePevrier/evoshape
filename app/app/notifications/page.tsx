import NotificationsClient from "./notifications-client";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const PAGE_SIZE = 20;

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "";

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, url, data, sent_at, read_at, deleted_at, source")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sent_at", { ascending: false })
    .limit(PAGE_SIZE);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .is("deleted_at", null);

  return (
    <NotificationsClient
      userId={userId}
      initialNotifications={notifications ?? []}
      initialUnreadCount={unreadCount ?? 0}
      pageSize={PAGE_SIZE}
    />
  );
}
