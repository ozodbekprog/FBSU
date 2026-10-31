import { requireUser } from "@/lib/auth";
import { Card, CardBody, PageHeader, ButtonLink } from "@/components/ui";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import SettingsManager from "@/components/settings/SettingsManager";
import PasskeyManager from "@/components/passkeys/passkey-manager";
import { listPasskeys } from "@/server/passkeys";
import { normalizeUserPreferences } from "@/components/settings/preferences";
import { getLocale, t } from "@/i18n";

export default async function SettingsPage() {
  const user = await requireUser();
  const preferences = normalizeUserPreferences(user.preferences);
  const telegramLinked = Boolean(user.telegramId);
  const passkeys = await listPasskeys(user.id);
  const locale = await getLocale();

  return (
    <>
      <PageHeader
        eyebrow={t(locale, "settingsEyebrow")}
        title={t(locale, "settingsTitle")}
        subtitle={t(locale, "settingsSubtitle")}
      />
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold tracking-tight text-brand-950">
              {t(locale, "commonLanguage")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {t(locale, "commonLanguageHint")}
            </p>
          </div>
          <LanguageSwitcher locale={locale} />
        </CardBody>
      </Card>
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold tracking-tight text-brand-950">Akkaunt xavfsizligi</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Ulangan 2 ta qurilma, har bir kirish tarixi (IP, qurilma, joylashuv) va sessiyada
              qilingan o'zgarishlar. Qurilma limiti: 2 ta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/settings/security" variant="secondary" size="sm">
              Xavfsizlikni ochish
            </ButtonLink>
            {user.role === "OWNER" ? (
              <ButtonLink href="/owner/security" variant="ghost" size="sm">
                OWNER jurnali
              </ButtonLink>
            ) : null}
          </div>
        </CardBody>
      </Card>
      <PasskeyManager initialItems={passkeys} />
      <SettingsManager
        initialPreferences={preferences}
        email={user.email}
        telegramLinked={telegramLinked}
      />
    </>
  );
}
