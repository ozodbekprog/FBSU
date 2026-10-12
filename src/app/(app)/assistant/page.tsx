import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.mscBugTitle };
}

export default async function AssistantPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <>
      <PageHeader
        eyebrow={dictionary.mscBugTitle}
        title={dictionary.mscBugTitle}
        subtitle={dictionary.mscBugSubtitle}
      />
      <div className="h-[calc(100dvh-13rem)] min-h-[24rem]">
        <AssistantChat />
      </div>
    </>
  );
}
