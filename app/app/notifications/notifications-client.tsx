"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { formatShortDate } from "@/lib/date";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  data: Record<string, unknown> | null;
  sent_at: string;
  read_at: string | null;
  deleted_at: string | null;
  source: string;
};

type NotificationsClientProps = {
  userId: string;
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  pageSize: number;
};

export default function NotificationsClient({
  userId,
  initialNotifications,
  initialUnreadCount,
  pageSize,
}: NotificationsClientProps) {
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = items.length % pageSize === 0 && items.length > 0;

  const unreadIds = useMemo(
    () => items.filter((item) => !item.read_at).map((item) => item.id),
    [items]
  );

  const refreshUnreadCount = async () => {
    if (!userId) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("deleted_at", null);
    setUnreadCount(count ?? 0);
  };

  const markAsRead = async (id: string) => {
    if (!userId) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item
      )
    );
    await refreshUnreadCount();
  };

  const markAllRead = async () => {
    if (!userId || unreadIds.length === 0) {
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const timestamp = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: timestamp })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("deleted_at", null);
    setItems((prev) =>
      prev.map((item) => (item.read_at ? item : { ...item, read_at: timestamp }))
    );
    await refreshUnreadCount();
    setLoading(false);
  };

  const softDelete = async (id: string) => {
    if (!userId) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const deletedAt = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ deleted_at: deletedAt })
      .eq("id", id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    await refreshUnreadCount();
  };

  const clearAll = async () => {
    if (!userId || items.length === 0) {
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const deletedAt = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ deleted_at: deletedAt })
      .eq("user_id", userId)
      .is("deleted_at", null);
    setItems([]);
    await refreshUnreadCount();
    setLoading(false);
  };

  const loadMore = async () => {
    if (!userId || loadingMore) {
      return;
    }
    setLoadingMore(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, url, data, sent_at, read_at, deleted_at, source")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sent_at", { ascending: false })
      .range(items.length, items.length + pageSize - 1);
    setItems((prev) => [...prev, ...(data ?? [])]);
    setLoadingMore(false);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Notifications
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Centre
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={loading || unreadIds.length === 0}
          >
            Tout marquer lu
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={loading || items.length === 0}
          >
            Vider
          </Button>
        </div>
      </header>

      <Card className="flex flex-wrap items-center justify-between gap-3 border border-[var(--border)] bg-white/70 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Non lues
          </p>
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {unreadCount}
          </p>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Les notifications supprimees sont retirees de la liste.
        </p>
      </Card>

      {items.length === 0 ? (
        <Card className="border border-[var(--border)] bg-white/70 text-sm text-[var(--muted)]">
          Aucune notification pour le moment.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="space-y-3 border border-[var(--border)] bg-white/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    {item.read_at ? "Lue" : "Non lue"} ·{" "}
                    {formatShortDate(item.sent_at)}
                  </p>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    {item.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.read_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(item.id)}
                    >
                      Marquer lu
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => softDelete(item.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">{item.body}</p>
              {item.url ? (
                <a className="text-sm font-semibold underline" href={item.url}>
                  Ouvrir
                </a>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Chargement..." : "Charger plus"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
