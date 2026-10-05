import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return { title: dictionary.mscNotFoundMetaTitle };
}

export default async function NotFound() {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-6xl font-bold tracking-tight text-slate-200 sm:text-7xl">
          4<span className="text-blue-600">0</span>4
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          {dictionary.mscNotFoundTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          {dictionary.mscNotFoundBodyRoot}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <ButtonLink href="/dashboard">{dictionary.mscBackToDashboard}</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {dictionary.mscHomePage}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
