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
      <PageHeader
        eyebrow={dictionary.msgEyebrowChat}
        title={dictionary.msgTitle}
        subtitle={dictionary.msgSubtitle}
      />
      <ChatClient currentUserId={user.id} initialUserId={initialUserId} />
    </>
  );
}
