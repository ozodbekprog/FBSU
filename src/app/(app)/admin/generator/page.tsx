import { requireRole } from "@/lib/auth";
import { getGeneratorStats } from "@/server/generator";
import { PageHeader } from "@/components/ui";
import GeneratorManager from "@/components/admin/GeneratorManager";
import { getDictionary, getLocale } from "@/i18n";

export default async function AdminGeneratorPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const stats = await getGeneratorStats();

  return (
    <>
      <PageHeader
        eyebrow={dictionary.admEyebrowManage}
        title={dictionary.admGeneratorTitle}
        subtitle={dictionary.admGeneratorSubtitle}
      />
      <GeneratorManager initial={stats} />
    </>
  );
}
