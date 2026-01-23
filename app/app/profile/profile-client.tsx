"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

type ProfileForm = {
  displayName: string;
  sex: string;
  birthYear: string;
  heightCm: string;
  targetCalories: string;
};

type ProfileClientProps = {
  userId: string;
  initialProfile: {
    display_name: string | null;
    sex: string | null;
    birth_year: number | null;
    height_cm: number | null;
    target_calories: number | null;
  } | null;
};

export default function ProfileClient({
  userId,
  initialProfile,
}: ProfileClientProps) {
  const [form, setForm] = useState<ProfileForm>(() => ({
    displayName: initialProfile?.display_name ?? "",
    sex: initialProfile?.sex ?? "",
    birthYear: initialProfile?.birth_year
      ? String(initialProfile.birth_year)
      : "",
    heightCm: initialProfile?.height_cm ? String(initialProfile.height_cm) : "",
    targetCalories: initialProfile?.target_calories
      ? String(initialProfile.target_calories)
      : "",
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    if (!userId) {
      setError("Impossible de recuperer la session.");
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const payload = {
      id: userId,
      display_name: form.displayName.trim() || null,
      sex: form.sex.trim() || null,
      birth_year: form.birthYear ? Number(form.birthYear) : null,
      height_cm: form.heightCm ? Number(form.heightCm) : null,
      target_calories: form.targetCalories ? Number(form.targetCalories) : null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setMessage("Profil enregistre.");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Ajuste tes objectifs et tes informations essentielles."
      />

      <Card className="space-y-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="display-name">Nom affiche</Label>
            <Input
              id="display-name"
              placeholder="Alex"
              value={form.displayName}
              onChange={(event) => updateField("displayName", event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sex">Sexe</Label>
            <Input
              id="sex"
              placeholder="female / male / other"
              value={form.sex}
              onChange={(event) => updateField("sex", event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth-year">Annee de naissance</Label>
            <Input
              id="birth-year"
              type="number"
              placeholder="1992"
              value={form.birthYear}
              onChange={(event) => updateField("birthYear", event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Taille (cm)</Label>
            <Input
              id="height"
              type="number"
              placeholder="170"
              value={form.heightCm}
              onChange={(event) => updateField("heightCm", event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Objectif calories</Label>
            <Input
              id="target"
              type="number"
              placeholder="2100"
              value={form.targetCalories}
              onChange={(event) =>
                updateField("targetCalories", event.target.value)
              }
              disabled={saving}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? (
          <p className="text-sm text-[var(--accent-strong)]">{message}</p>
        ) : null}
      </Card>
    </div>
  );
}
