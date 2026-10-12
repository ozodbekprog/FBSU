import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { jitsiEmbedUrl, jitsiUrl } from "@/lib/jitsi";

const ROOM_PATTERN = /^[a-z0-9-]{3,40}$/;

export default async function LessonRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { room } = await params;

  if (!ROOM_PATTERN.test(room)) notFound();

  return (
    <>
      <PageHeader title={dictionary.vidTitle} subtitle={dictionary.vidSubtitle} />
      <Card>
        <CardHeader title={dictionary.vidLinkLabel} />
        <CardBody className="space-y-5">
          <code className="block break-all rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800">
            {jitsiUrl(room)}
          </code>
          <p className="text-sm leading-relaxed text-slate-600">{dictionary.vidJoinHint}</p>
          <iframe
            src={jitsiEmbedUrl(room)}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="h-[70vh] w-full rounded-2xl border border-slate-200"
            title={dictionary.vidTitle}
          />
        </CardBody>
      </Card>
      <div className="mt-4">
        <ButtonLink href="/schedule" variant="secondary" size="sm">
          {dictionary.vidBackToLesson}
        </ButtonLink>
      </div>
    </>
  );
}
