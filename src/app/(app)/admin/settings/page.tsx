import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import SettingsManager, { type SettingsModule } from "@/components/admin/SettingsManager";
import { MODULE_KEYS, MODULE_META, getModuleFlags } from "@/server/settings";
import { getDictionary, getLocale } from "@/i18n";

export default async function AdminSettingsPage() {
  await requireRole(["ADMIN", "REKTOR"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const flags = await getModuleFlags();

  const modules: SettingsModule[] = MODULE_KEYS.map((key) => ({
    key,
    title: MODULE_META[key].title,
    description: MODULE_META[key].description,
  }));

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowManage}
        title={dictionary.admSettings}
        subtitle={dictionary.admSettingsPageSubtitle}
      />
      <SettingsManager modules={modules} initialFlags={flags} />
    </>
  );
}
