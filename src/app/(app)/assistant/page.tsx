import type { Metadata } from "next";
import { getDictionary, getLocale } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getLocale());
  return { title: dictionary.mscBugTitle };
}

export default async function AssistantPage() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const user = await getCurrentUser();
  return (
    <div
      translate="no"
      className="flex h-[calc(100dvh-6.5rem)] min-h-[28rem] flex-col md:h-[calc(100dvh-4rem)]"
    >
      <div className="-mx-4 min-h-0 flex-1 md:-mx-8 md:-mb-8">
        <AssistantChat
          name={user?.name ?? ""}
          role={user?.role ?? "STUDENT"}
          status={dictionary.mscBugSubtitle}
        />
      </div>
    </div>
  );
}
