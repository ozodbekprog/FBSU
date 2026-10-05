import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { SearchForm } from "@/components/search/search-form";
import { SearchResultsView } from "@/components/search/search-results";
import { SearchEmpty } from "@/components/search/search-empty";
import { SEARCH_MIN_LENGTH, searchAll } from "@/components/search/search-data";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const active = query.length >= SEARCH_MIN_LENGTH;
  const data = await searchAll(user, query);

  return (
    <>
      <PageHeader
        eyebrow={dictionary.mscSearchEyebrow}
        title={dictionary.mscSearchTitle}
        subtitle={dictionary.mscSearchSubtitle}
      />
      <SearchForm defaultValue={query} />
      {active ? (
        <SearchResultsView query={query} data={data} />
      ) : (
        <SearchEmpty
          title={query ? dictionary.mscSearchTooShort : dictionary.mscSearchPrompt}
          description={
            query
              ? dictionary.mscSearchMinBodyQuery
                  .replace("{query}", query)
                  .replace("{min}", String(SEARCH_MIN_LENGTH))
              : dictionary.mscSearchMinBodyDefault.replace("{min}", String(SEARCH_MIN_LENGTH))
          }
        />
      )}
    </>
  );
}
