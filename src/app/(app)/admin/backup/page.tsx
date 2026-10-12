import { requireRole } from "@/lib/auth";
import { getMaintenanceMode } from "@/server/maintenance";
import { getBackupCounts } from "@/app/api/admin/backup/data";
import BackupManager from "@/components/admin/BackupManager";

export const metadata = {
  title: "Zaxira | FBSU",
};

export default async function AdminBackupPage() {
  await requireRole(["ADMIN"]);
  const [counts, maintenance] = await Promise.all([getBackupCounts(), getMaintenanceMode()]);

  return (
    <div className="animate-fade-up">
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          Administrator
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-950">Zaxira va texnik xizmat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Asosiy jadvallarni JSON sifatida eksport qiling va texnik xizmat rejimini boshqaring.
        </p>
      </div>
      <BackupManager initialCounts={counts} initialMaintenance={maintenance} />
    </div>
  );
}
