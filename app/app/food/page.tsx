import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const templates = [
  { name: "Bol proteine", calories: 520 },
  { name: "Salade energie", calories: 420 },
  { name: "Snack rapide", calories: 220 },
];

export default function FoodPage() {
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
            <Button size="sm" variant="soft">
              Nouveau
            </Button>
          </div>
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.name}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-[var(--foreground)]">
                  {template.name}
                </span>
                <span className="text-[var(--muted)]">
                  {template.calories} kcal
                </span>
              </div>
            ))}
          </div>
          <form className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="template-name">Nom</Label>
              <Input id="template-name" placeholder="Ex: Bowl poulet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-calories">Calories</Label>
              <Input id="template-calories" type="number" placeholder="480" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-protein">Proteines (g)</Label>
              <Input id="template-protein" type="number" placeholder="32" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-carbs">Glucides (g)</Label>
              <Input id="template-carbs" type="number" placeholder="45" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-fat">Lipides (g)</Label>
              <Input id="template-fat" type="number" placeholder="18" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Ajouter le template</Button>
            </div>
          </form>
        </Card>

        <Card variant="outline" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Journal du jour
            </h2>
            <span className="text-sm font-semibold text-[var(--accent-strong)]">
              1 680 kcal
            </span>
          </div>
          <form className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="meal-type">Type de repas</Label>
              <Select id="meal-type" defaultValue="breakfast">
                <option value="breakfast">Petit dejeuner</option>
                <option value="lunch">Dejeuner</option>
                <option value="dinner">Diner</option>
                <option value="snack">Snack</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-template">Template</Label>
              <Select id="meal-template" defaultValue="">
                <option value="">Choisir un template</option>
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-name">Ou repas custom</Label>
              <Input id="meal-name" placeholder="Ex: Wrap tofu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-calories">Calories</Label>
              <Input id="meal-calories" type="number" placeholder="520" />
            </div>
            <Button type="submit">Ajouter au journal</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
