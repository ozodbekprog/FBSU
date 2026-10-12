import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canScanAccess, canViewAccessLogs } from "@/modules/roles/access";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { AccessKiosk } from "@/components/access/access-kiosk";
import { AccessHistory } from "@/components/access/access-history";
import { defaultAccessHistoryFilters } from "@/modules/access/history";
import { getAccessHistory } from "@/server/access-history";

export default async function AccessPage() {
  const user = await requireUser();
  if (!canViewAccessLogs(user.role)) redirect("/dashboard");

  const dictionary = getDictionary(await getLocale());
  const canScan = canScanAccess(user.role);
  const history = await getAccessHistory(defaultAccessHistoryFilters());

  return (
    <>
      <PageHeader title={dictionary.accTitle} subtitle={dictionary.accSubtitle} />
      {canScan ? <AccessKiosk /> : null}
      <AccessHistory
        initialLogs={history.logs}
        initialStats={history.stats}
        initialTotal={history.total}
      />
    </>
  );
}
