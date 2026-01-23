import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Ajuste tes objectifs et tes informations essentielles."
      />

      <Card className="space-y-6">
        <form className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display-name">Nom affiche</Label>
            <Input id="display-name" placeholder="Alex" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sex">Sexe</Label>
            <Input id="sex" placeholder="female / male / other" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth-year">Annee de naissance</Label>
            <Input id="birth-year" type="number" placeholder="1992" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Taille (cm)</Label>
            <Input id="height" type="number" placeholder="170" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Objectif calories</Label>
            <Input id="target" type="number" placeholder="2100" />
          </div>
          <div className="flex items-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
