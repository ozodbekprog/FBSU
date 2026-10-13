import { Logo } from "@/components/brand/logo";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { requireUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";

export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
            <Logo />
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden max-w-[180px] truncate text-sm font-medium text-slate-700 sm:inline">
                {user.name}
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                {dictionary.secModeChip}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      </div>
    </LocaleProvider>
  );
}
