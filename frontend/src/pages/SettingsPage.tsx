import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pengaturan sistem"
        title="Settings"
        description="Batas normal metrik, debit pompa, dan akun pengguna."
      />
      <Card>
        <p className="text-sm text-ink-muted">Pengaturan akan tersedia setelah UTS.</p>
      </Card>
    </div>
  );
}
