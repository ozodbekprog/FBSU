import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import ImportManager from "@/components/admin/ImportManager";
import { getDictionary, getLocale } from "@/i18n";

export default async function AdminImportPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageHeader
        title={dictionary.admImportPageTitle}
        subtitle={dictionary.admImportPageSubtitle}
      />
      <ImportManager />
    </>
  );
}
