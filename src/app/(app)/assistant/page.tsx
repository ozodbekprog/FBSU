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
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[30rem] flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pe-1">
        <div>
          <h1 className="flex items-center gap-3 font-serif text-3xl leading-tight text-slate-900 sm:text-4xl">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              className="size-6 text-gold-400 sm:size-7"
            >
              <rect x="6.2" y="6.2" width="11.6" height="11.6" />
              <rect x="6.2" y="6.2" width="11.6" height="11.6" transform="rotate(45 12 12)" />
            </svg>
            {dictionary.mscBugTitle}
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-[13px] text-slate-500">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {dictionary.mscBugSubtitle}
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <AssistantChat name={user?.name ?? ""} role={user?.role ?? "STUDENT"} />
      </div>
    </div>
  );
}
