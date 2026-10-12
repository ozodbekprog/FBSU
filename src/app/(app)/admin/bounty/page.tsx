import { requireRole } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import BountyView from "@/components/bounty/bounty-view";
import { parseBountyFilter } from "@/lib/bug-bounty";

export default async function AdminBountyPage({
  searchParams,
}: {
  searchParams: Promise<{ holat?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;

  return (
    <BountyView
      basePath="/admin/bounty"
      filter={parseBountyFilter(params.holat)}
      eyebrow={dictionary.admEyebrowAdmin}
    />
  );
}
