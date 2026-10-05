import { requireRole } from "@/lib/auth";
import { buildGroupSummaries, getCuratorGroups } from "@/app/api/curator/data";
import { EmptyState, PageHeader } from "@/components/ui";
import { CuratorGroupCards } from "@/components/curator/group-cards";
import { getDictionary, getLocale, t as translate } from "@/i18n";

export default async function CuratorPage() {
  const user = await requireRole(["TEACHER", "ADMIN", "TYUTOR"]);
  const groups = await getCuratorGroups(user);
  const summaries = await buildGroupSummaries(groups);

  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageHeader
        title={dictionary.admCuratorTitle}
        eyebrow={dictionary.admEyebrowCurator}
        subtitle={
          user.role === "ADMIN"
            ? translate(locale, "admCuratorAllGroups", { count: summaries.length })
            : translate(locale, "admCuratorAssigned", { count: summaries.length })
        }
      />
      {summaries.length === 0 ? (
        <EmptyState
          title={dictionary.admCuratorEmptyTitle}
          description={dictionary.admCuratorEmptyDesc}
        />
      ) : (
        <CuratorGroupCards groups={summaries} showCurator={user.role === "ADMIN"} />
      )}
    </>
  );
}
