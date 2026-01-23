import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Parametres"
        description="Notifications et preferences essentielles."
      />

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Notifications
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Active les rappels pour rester constant. Cette section sera connectee
          a OneSignal.
        </p>
        <Button variant="outline">Activer</Button>
      </Card>
    </div>
  );
}
