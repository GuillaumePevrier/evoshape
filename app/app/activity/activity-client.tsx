"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { getISODate } from "@/lib/date";

type ActivityLog = {
  id: number;
  activity_type: string;
  duration_min: number | null;
  calories_burned: number | null;
};

type ActivityClientProps = {
  userId: string;
  initialLogs: ActivityLog[];
};

export default function ActivityClient({
  userId,
  initialLogs,
}: ActivityClientProps) {
  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBurned = useMemo(
    () =>
      logs.reduce(
        (sum, item) => sum + (item.calories_burned ?? 0),
        0
      ),
    [logs]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (!userId) {
      setError("Session introuvable.");
      setSaving(false);
      return;
    }

    const durationValue = Number(duration);
    const caloriesValue = Number(calories);

    if (!type.trim() || !durationValue || !caloriesValue) {
      setError("Renseigne type, duree et calories.");
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("activity_logs").insert({
      user_id: userId,
      recorded_at: getISODate(),
      activity_type: type.trim(),
      duration_min: durationValue,
      calories_burned: caloriesValue,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setType("");
      setDuration("");
      setCalories("");
      const { data } = await supabase
        .from("activity_logs")
        .select("id, activity_type, duration_min, calories_burned")
        .eq("recorded_at", getISODate())
        .order("created_at", { ascending: false });
      setLogs((data ?? []) as ActivityLog[]);
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activites"
        description="Ajoute tes activites et les calories brulees."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Nouvelle activite
          </h2>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="activity-type">Type</Label>
              <Input
                id="activity-type"
                placeholder="Ex: Course, Yoga"
                value={type}
                onChange={(event) => setType(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-duration">Duree (min)</Label>
              <Input
                id="activity-duration"
                type="number"
                placeholder="30"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-calories">Calories brulees</Label>
              <Input
                id="activity-calories"
                type="number"
                placeholder="210"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </Card>

        <Card variant="outline" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Total aujourd&apos;hui
          </p>
          <p className="text-3xl font-semibold text-[var(--foreground)]">
            {totalBurned.toFixed(0)} kcal
          </p>
          <p className="text-sm text-[var(--muted)]">
            Continue a bouger pour booster ton energie.
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Journal du jour
        </h2>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Aucune activite ajoutee aujourd&apos;hui.
            </p>
          ) : (
            logs.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-[var(--foreground)]">
                  {activity.activity_type}
                </span>
                <span className="text-[var(--muted)]">
                  {activity.duration_min} min
                </span>
                <span className="text-[var(--foreground)]">
                  {activity.calories_burned} kcal
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
