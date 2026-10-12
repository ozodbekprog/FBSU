import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import ImportManager from "@/components/admin/ImportManager";
import { getDictionary, getLocale } from "@/i18n";

export default async function AdminImportPage() {
  const user = await requireRole(["ADMIN", "REGISTRAR"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageHeader
        title={dictionary.admImportPageTitle}
        subtitle={dictionary.admImportPageSubtitle}
      />
      {user.role === "REGISTRAR" ? (
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          {dictionary.admImportRegistrarHint}
        </p>
      ) : null}
      <ImportManager />
    </>
  );
}
