import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChatClient } from "@/components/chat/ChatClient";
import { getDictionary, getLocale } from "@/i18n";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const initialUserId =
    typeof params.user === "string" && params.user.length > 0 ? params.user : undefined;
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <div className="md:hidden">
        <PageHeader
          eyebrow={dictionary.msgEyebrowChat}
          title={dictionary.msgTitle}
          subtitle={dictionary.msgSubtitle}
        />
      </div>
      <div className="md:fixed md:inset-y-0 md:right-0 md:left-64 md:z-20 md:bg-surface">
        <ChatClient currentUserId={user.id} initialUserId={initialUserId} />
      </div>
    </>
  );
}
