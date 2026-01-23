"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { getISODate } from "@/lib/date";

type Template = {
  id: number;
  name: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

type MealLog = {
  id: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string | null;
  calories: number | null;
  created_at: string;
};

const mealLabels: Record<MealLog["meal_type"], string> = {
  breakfast: "Petit dejeuner",
  lunch: "Dejeuner",
  dinner: "Diner",
  snack: "Snack",
};

type FoodClientProps = {
  userId: string;
  initialTemplates: Template[];
  initialLogs: MealLog[];
};

export default function FoodClient({
  userId,
  initialTemplates,
  initialLogs,
}: FoodClientProps) {
  const minCalories = 50;
  const maxCalories = 5000;

  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [logs, setLogs] = useState<MealLog[]>(initialLogs);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [templateName, setTemplateName] = useState("");
  const [templateCalories, setTemplateCalories] = useState("");
  const [templateProtein, setTemplateProtein] = useState("");
  const [templateCarbs, setTemplateCarbs] = useState("");
  const [templateFat, setTemplateFat] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [mealType, setMealType] =
    useState<MealLog["meal_type"]>("breakfast");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editLogName, setEditLogName] = useState("");
  const [editLogCalories, setEditLogCalories] = useState("");
  const [editLogType, setEditLogType] =
    useState<MealLog["meal_type"]>("breakfast");
  const [editStatus, setEditStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{
    name: string;
    calories: string;
    type: MealLog["meal_type"];
  } | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<
    Array<{
      id: number;
      entry: MealLog;
      timer: ReturnType<typeof setTimeout>;
    }>
  >([]);
  const pendingDeletesRef = useRef(pendingDeletes);

  const totalCalories = useMemo(
    () =>
      logs.reduce(
        (sum, item) => sum + (item.calories ? Number(item.calories) : 0),
        0
      ),
    [logs]
  );

  const templateCaloriesValue = Number(templateCalories);
  const templateCaloriesError =
    templateCalories &&
    (templateCaloriesValue < minCalories ||
      templateCaloriesValue > maxCalories)
      ? `Calories entre ${minCalories} et ${maxCalories}.`
      : null;
  const canSubmitTemplate =
    templateName.trim().length > 0 &&
    !templateCaloriesError &&
    templateCalories !== "";

  const mealCaloriesValue = Number(mealCalories);
  const mealCaloriesError =
    mealCalories &&
    (mealCaloriesValue < minCalories || mealCaloriesValue > maxCalories)
      ? `Calories entre ${minCalories} et ${maxCalories}.`
      : null;
  const canSubmitMeal =
    mealName.trim().length > 0 &&
    !mealCaloriesError &&
    mealCalories !== "";

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      pendingDeletesRef.current.forEach((item) => clearTimeout(item.timer));
    };
  }, []);

  useEffect(() => {
    pendingDeletesRef.current = pendingDeletes;
  }, [pendingDeletes]);

  const resetTemplateForm = () => {
    setTemplateName("");
    setTemplateCalories("");
    setTemplateProtein("");
    setTemplateCarbs("");
    setTemplateFat("");
    setEditingTemplate(null);
  };

  const handleTemplateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!userId) {
      setError("Session introuvable.");
      return;
    }

    if (!templateName.trim() || !templateCalories) {
      setError("Nom et calories sont requis.");
      return;
    }

    if (templateCaloriesError) {
      setError(templateCaloriesError);
      return;
    }

    const payload = {
      user_id: userId,
      name: templateName.trim(),
      calories: Number(templateCalories),
      protein_g: templateProtein ? Number(templateProtein) : null,
      carbs_g: templateCarbs ? Number(templateCarbs) : null,
      fat_g: templateFat ? Number(templateFat) : null,
      updated_at: new Date().toISOString(),
    };

    const supabase = createSupabaseBrowserClient();
    const { error: saveError } = editingTemplate
      ? await supabase
          .from("meal_templates")
          .update(payload)
          .eq("id", editingTemplate.id)
      : await supabase.from("meal_templates").insert(payload);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    const { data } = await supabase
      .from("meal_templates")
      .select("id, name, calories, protein_g, carbs_g, fat_g")
      .order("created_at", { ascending: false });

    setTemplates((data ?? []) as Template[]);
    setMessage(
      editingTemplate ? "Template mis a jour." : "Template ajoute."
    );
    resetTemplateForm();
  };

  const handleTemplateEdit = (template: Template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateCalories(String(template.calories));
    setTemplateProtein(template.protein_g ? String(template.protein_g) : "");
    setTemplateCarbs(template.carbs_g ? String(template.carbs_g) : "");
    setTemplateFat(template.fat_g ? String(template.fat_g) : "");
  };

  const handleTemplateDelete = async (templateId: number) => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("meal_templates")
      .delete()
      .eq("id", templateId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const { data } = await supabase
      .from("meal_templates")
      .select("id, name, calories, protein_g, carbs_g, fat_g")
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as Template[]);
  };

  const handleLogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!userId) {
      setError("Session introuvable.");
      return;
    }

    const caloriesValue = Number(mealCalories);
    if (!mealName.trim() || !caloriesValue) {
      setError("Renseigne un nom et des calories.");
      return;
    }

    if (mealCaloriesError) {
      setError(mealCaloriesError);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: logError } = await supabase.from("meal_logs").insert({
      user_id: userId,
      recorded_at: getISODate(),
      meal_type: mealType,
      template_id: selectedTemplateId ? Number(selectedTemplateId) : null,
      name: mealName.trim(),
      calories: caloriesValue,
    });

    if (logError) {
      setError(logError.message);
      return;
    }

    setMealName("");
    setMealCalories("");
    setSelectedTemplateId("");

    const { data } = await supabase
      .from("meal_logs")
      .select("id, meal_type, name, calories, created_at")
      .eq("recorded_at", getISODate())
      .order("created_at", { ascending: false });
    setLogs((data ?? []) as MealLog[]);
  };

  const handleLogEdit = (log: MealLog) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setEditingLogId(log.id);
    setEditLogName(log.name ?? "");
    setEditLogCalories(log.calories ? String(log.calories) : "");
    setEditLogType(log.meal_type);
    lastSavedRef.current = {
      name: log.name ?? "",
      calories: log.calories ? String(log.calories) : "",
      type: log.meal_type,
    };
    setEditStatus("idle");
    setError(null);
  };

  const handleLogCancel = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setEditingLogId(null);
    setEditLogName("");
    setEditLogCalories("");
    setEditLogType("breakfast");
    setEditStatus("idle");
  };

  const handleAutoSave = async (
    logId: number,
    nextName: string,
    nextCalories: string,
    nextType: MealLog["meal_type"]
  ) => {
    if (!nextName.trim() || nextCalories === "") {
      return;
    }

    const caloriesValue = Number(nextCalories);
    if (
      caloriesValue < minCalories ||
      caloriesValue > maxCalories ||
      Number.isNaN(caloriesValue)
    ) {
      setEditStatus("error");
      return;
    }

    const lastSaved = lastSavedRef.current;
    if (
      lastSaved &&
      lastSaved.name === nextName &&
      lastSaved.calories === nextCalories &&
      lastSaved.type === nextType
    ) {
      return;
    }

    setEditStatus("saving");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("meal_logs")
      .update({
        meal_type: nextType,
        name: nextName.trim(),
        calories: caloriesValue,
      })
      .eq("id", logId);

    if (updateError) {
      setEditStatus("error");
      setError(updateError.message);
      return;
    }

    lastSavedRef.current = {
      name: nextName,
      calories: nextCalories,
      type: nextType,
    };
    setLogs((prev) =>
      prev.map((entry) =>
        entry.id === logId
          ? {
              ...entry,
              meal_type: nextType,
              name: nextName.trim(),
              calories: caloriesValue,
            }
          : entry
      )
    );
    setError(null);
    setEditStatus("saved");
    setTimeout(() => setEditStatus("idle"), 1200);
  };

  const queueAutoSave = (
    logId: number,
    nextName: string,
    nextCalories: string,
    nextType: MealLog["meal_type"]
  ) => {
    if (!logId) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void handleAutoSave(logId, nextName, nextCalories, nextType);
    }, 700);
  };

  const handleLogDelete = async (logId: number) => {
    const entry = logs.find((item) => item.id === logId);
    if (!entry) {
      return;
    }

    if (editingLogId === logId) {
      handleLogCancel();
    }

    setLogs((prev) => prev.filter((item) => item.id !== logId));
    const timer = setTimeout(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: deleteError } = await supabase
        .from("meal_logs")
        .delete()
        .eq("id", logId);

      if (deleteError) {
        setError(deleteError.message);
        setLogs((prev) => [entry, ...prev]);
      }

      setPendingDeletes((prev) => prev.filter((item) => item.id !== logId));
    }, 5000);

    setPendingDeletes((prev) => [{ id: logId, entry, timer }, ...prev]);
  };

  const handleUndoDelete = (logId: number) => {
    const pending = pendingDeletes.find((item) => item.id === logId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    setPendingDeletes((prev) => prev.filter((item) => item.id !== logId));
    setLogs((prev) => [pending.entry, ...prev]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repas"
        description="Gere tes templates et ajoute un repas du jour."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Templates
            </h2>
            {editingTemplate ? (
              <Button size="sm" variant="ghost" onClick={resetTemplateForm}>
                Annuler
              </Button>
            ) : null}
          </div>
          <div className="space-y-3">
            {templates.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Aucun template pour le moment.
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-[var(--foreground)]">
                    {template.name}
                  </span>
                  <span className="text-[var(--muted)]">
                    {template.calories} kcal
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTemplateEdit(template)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTemplateDelete(template.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleTemplateSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="template-name">Nom</Label>
              <Input
                id="template-name"
                placeholder="Ex: Bowl poulet"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-calories">Calories</Label>
              <Input
                id="template-calories"
                type="number"
                placeholder="480"
                value={templateCalories}
                onChange={(event) => setTemplateCalories(event.target.value)}
                min={minCalories}
                max={maxCalories}
              />
              {templateCaloriesError ? (
                <p className="text-xs text-red-600">{templateCaloriesError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-protein">Proteines (g)</Label>
              <Input
                id="template-protein"
                type="number"
                placeholder="32"
                value={templateProtein}
                onChange={(event) => setTemplateProtein(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-carbs">Glucides (g)</Label>
              <Input
                id="template-carbs"
                type="number"
                placeholder="45"
                value={templateCarbs}
                onChange={(event) => setTemplateCarbs(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-fat">Lipides (g)</Label>
              <Input
                id="template-fat"
                type="number"
                placeholder="18"
                value={templateFat}
                onChange={(event) => setTemplateFat(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!canSubmitTemplate}>
                {editingTemplate ? "Mettre a jour" : "Ajouter le template"}
              </Button>
            </div>
          </form>
        </Card>

        <Card variant="outline" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Journal du jour
            </h2>
            <span className="text-sm font-semibold text-[var(--accent-strong)]">
              {totalCalories.toFixed(0)} kcal
            </span>
          </div>
          <form className="space-y-3" onSubmit={handleLogSubmit}>
            <div className="space-y-2">
              <Label htmlFor="meal-type">Type de repas</Label>
              <Select
                id="meal-type"
                value={mealType}
                onChange={(event) =>
                  setMealType(event.target.value as MealLog["meal_type"])
                }
              >
                <option value="breakfast">Petit dejeuner</option>
                <option value="lunch">Dejeuner</option>
                <option value="dinner">Diner</option>
                <option value="snack">Snack</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-template">Template</Label>
              <Select
                id="meal-template"
                value={selectedTemplateId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedTemplateId(value);
                  const template = templates.find(
                    (item) => String(item.id) === value
                  );
                  if (template) {
                    setMealName(template.name);
                    setMealCalories(String(template.calories));
                  }
                }}
              >
                <option value="">Choisir un template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-name">Ou repas custom</Label>
              <Input
                id="meal-name"
                placeholder="Ex: Wrap tofu"
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-calories">Calories</Label>
              <Input
                id="meal-calories"
                type="number"
                placeholder="520"
                value={mealCalories}
                onChange={(event) => setMealCalories(event.target.value)}
                min={minCalories}
                max={maxCalories}
              />
              {mealCaloriesError ? (
                <p className="text-xs text-red-600">{mealCaloriesError}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={!canSubmitMeal}>
              Ajouter au journal
            </Button>
          </form>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Aucun repas ajoute aujourd&apos;hui.
              </p>
            ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
              >
                {editingLogId === log.id ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      value={editLogName}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setEditLogName(nextValue);
                        if (editingLogId) {
                          queueAutoSave(
                            editingLogId,
                            nextValue,
                            editLogCalories,
                            editLogType
                          );
                        }
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={editLogType}
                      onChange={(event) => {
                        const nextValue = event.target.value as MealLog["meal_type"];
                        setEditLogType(nextValue);
                        if (editingLogId) {
                          queueAutoSave(
                            editingLogId,
                            editLogName,
                            editLogCalories,
                            nextValue
                          );
                        }
                      }}
                      className="w-44"
                    >
                      <option value="breakfast">Petit dejeuner</option>
                      <option value="lunch">Dejeuner</option>
                      <option value="dinner">Diner</option>
                      <option value="snack">Snack</option>
                    </Select>
                    <Input
                      type="number"
                      value={editLogCalories}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setEditLogCalories(nextValue);
                        if (editingLogId) {
                          queueAutoSave(
                            editingLogId,
                            editLogName,
                            nextValue,
                            editLogType
                          );
                        }
                      }}
                      className="w-28"
                      min={minCalories}
                      max={maxCalories}
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
                        onClick={handleLogCancel}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--foreground)]">
                      {log.name ?? "Repas"}
                    </span>
                    <span className="text-[var(--muted)]">
                      {mealLabels[log.meal_type]}
                    </span>
                    <span className="text-[var(--foreground)]">
                      {Number(log.calories).toFixed(0)} kcal
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLogEdit(log)}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLogDelete(log.id)}
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

      {pendingDeletes.length > 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-xs text-[var(--muted)]">
          <div className="space-y-2">
            {pendingDeletes.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <span>
                  Suppression planifiee: {item.entry.name ?? "Repas"} (
                  {Number(item.entry.calories ?? 0).toFixed(0)} kcal)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUndoDelete(item.id)}
                >
                  Annuler
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? (
        <p className="text-sm text-[var(--accent-strong)]">{message}</p>
      ) : null}
    </div>
  );
}
