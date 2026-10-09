"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-md">
        <CardBody className="flex flex-col items-center gap-3 px-8 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-rose-50 text-2xl font-semibold text-rose-600">
            !
          </span>
          <h2 className="text-lg font-semibold text-slate-900">{t("mscErrorTitle")}</h2>
          <p className="text-sm text-slate-500">{t("mscErrorBody")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => reset()}>{t("mscRetry")}</Button>
            <ButtonLink href="/login" variant="secondary">
              {t("authLoginTitle")}
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
