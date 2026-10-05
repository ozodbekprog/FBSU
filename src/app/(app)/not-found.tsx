import { ButtonLink, Card, CardBody } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";

export default async function NotFound() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center gap-3 px-8 py-10 text-center">
          <p className="text-5xl font-bold tracking-tight text-slate-200">
            4<span className="text-blue-600">0</span>4
          </p>
          <h1 className="text-lg font-semibold text-slate-900">{dictionary.mscNotFoundTitle}</h1>
          <p className="text-sm text-slate-500">{dictionary.mscNotFoundBodyApp}</p>
          <div className="mt-2">
            <ButtonLink href="/dashboard">{dictionary.mscBackToDashboard}</ButtonLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
