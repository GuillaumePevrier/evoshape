"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { formatShortDate, getISODate } from "@/lib/date";
import { calculateDelta7Days } from "@/lib/metrics";

type WeightEntry = {
  id: number;
  recorded_at: string;
  weight_kg: number | string;
};

type WeightClientProps = {
  userId: string;
  initialEntries: WeightEntry[];
};

export default function WeightClient({
  userId,
  initialEntries,
}: WeightClientProps) {
  const minWeight = 30;
  const maxWeight = 300;

  const [weight, setWeight] = useState("");
  const [recordedAt, setRecordedAt] = useState(getISODate());
  const [entries, setEntries] = useState<WeightEntry[]>(initialEntries);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ weight: string; date: string } | null>(null);

  const delta7 = useMemo(() => calculateDelta7Days(entries), [entries]);
  const weightValue = Number(weight);
  const weightError =
    weight &&
    (weightValue < minWeight || weightValue > maxWeight)
      ? `Poids entre ${minWeight} et ${maxWeight} kg.`
      : null;
  const canSubmit = !saving && !weightError && Boolean(recordedAt) && weight !== "";

  const refreshEntries = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("weights")
      .select("id, recorded_at, weight_kg")
      .order("recorded_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }

    setEntries((data ?? []) as WeightEntry[]);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const numericWeight = Number(weight);
    if (
      !numericWeight ||
      numericWeight < minWeight ||
      numericWeight > maxWeight
    ) {
      setError(`Poids entre ${minWeight} et ${maxWeight} kg.`);
      setSaving(false);
      return;
    }

    if (!userId) {
      setError("Impossible de recuperer la session.");
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: upsertError } = await supabase
      .from("weights")
      .upsert(
        {
          user_id: userId,
          weight_kg: numericWeight,
          recorded_at: recordedAt,
        },
        { onConflict: "user_id,recorded_at" }
      );

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setWeight("");
      await refreshEntries();
    }

    setSaving(false);
  };

  const handleEdit = (entry: WeightEntry) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setEditingId(entry.id);
    setEditWeight(String(entry.weight_kg));
    setEditDate(entry.recorded_at);
    lastSavedRef.current = {
      weight: String(entry.weight_kg),
      date: entry.recorded_at,
    };
    setEditStatus("idle");
    setError(null);
  };

  const handleCancelEdit = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setEditingId(null);
    setEditWeight("");
    setEditDate("");
    setEditStatus("idle");
  };

  const handleAutoSave = async (
    entryId: number,
    nextWeight: string,
    nextDate: string
  ) => {
    const numericWeight = Number(nextWeight);
    if (!nextDate) {
      setEditStatus("error");
      return;
    }
    if (
      !numericWeight ||
      numericWeight < minWeight ||
      numericWeight > maxWeight
    ) {
      setEditStatus("error");
      return;
    }

    const lastSaved = lastSavedRef.current;
    if (
      lastSaved &&
      lastSaved.weight === nextWeight &&
      lastSaved.date === nextDate
    ) {
      return;
    }

    setEditStatus("saving");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("weights")
      .update({
        weight_kg: numericWeight,
        recorded_at: nextDate,
      })
      .eq("id", entryId);

    if (updateError) {
      setEditStatus("error");
      setError(updateError.message);
      return;
    }

    lastSavedRef.current = { weight: nextWeight, date: nextDate };
    setEntries((prev) =>
      [...prev]
        .map((entry) =>
          entry.id === entryId
            ? { ...entry, weight_kg: numericWeight, recorded_at: nextDate }
            : entry
        )
        .sort(
          (a, b) =>
            new Date(b.recorded_at).getTime() -
            new Date(a.recorded_at).getTime()
        )
    );
    setError(null);
    setEditStatus("saved");
    setTimeout(() => setEditStatus("idle"), 1200);
  };

  const queueAutoSave = (
    entryId: number,
    nextWeight: string,
    nextDate: string
  ) => {
    if (!entryId) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void handleAutoSave(entryId, nextWeight, nextDate);
    }, 700);
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm("Supprimer cette mesure ?")) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("weights")
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await refreshEntries();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Poids"
        description="Ajoute ton poids et observe la tendance."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Nouvelle mesure
          </h2>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="72.4"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                disabled={saving}
                min={minWeight}
                max={maxWeight}
              />
              {weightError ? (
                <p className="text-xs text-red-600">{weightError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={recordedAt}
                onChange={(event) => setRecordedAt(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!canSubmit}>
                {saving ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
          </form>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </Card>
        <Card variant="outline" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Variation 7 jours
          </p>
          <p className="text-3xl font-semibold text-[var(--foreground)]">
            {delta7 === null
              ? "--"
              : `${delta7 >= 0 ? "+" : ""}${delta7.toFixed(1)} kg`}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {delta7 === null
              ? "Ajoute plus de mesures."
              : "Tendance sur la derniere semaine."}
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Historique
        </h2>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Aucune mesure pour le moment.
            </p>
          ) : (
            entries.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
              >
                {editingId === item.id ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      type="number"
                      value={editWeight}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setEditWeight(nextValue);
                        if (editingId) {
                          queueAutoSave(editingId, nextValue, editDate);
                        }
                      }}
                      className="w-32"
                      min={minWeight}
                      max={maxWeight}
                    />
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setEditDate(nextValue);
                        if (editingId) {
                          queueAutoSave(editingId, editWeight, nextValue);
                        }
                      }}
                      className="w-44"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">
                        {editStatus === "saving"
                          ? "Enregistrement..."
                          : editStatus === "saved"
                            ? "Enregistre"
                            : editStatus === "error"
                              ? "Erreur"
                              : "Auto-save actif"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[var(--muted)]">
                      {formatShortDate(item.recorded_at)}
                    </span>
                    <span className="font-semibold text-[var(--foreground)]">
                      {Number(item.weight_kg).toFixed(1)} kg
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
