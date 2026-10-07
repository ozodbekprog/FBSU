"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, CardBody } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function MyQrCard({
  token,
  name,
  roleLabel,
}: {
  token: string;
  name: string;
  roleLabel: string;
}) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, { width: 640, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card className="mx-auto max-w-md">
      <CardBody className="flex flex-col items-center gap-4 text-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={t("accMyQr")}
            width={640}
            height={640}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          />
        ) : (
          <div className="aspect-square w-full max-w-sm animate-pulse rounded-2xl bg-slate-100" />
        )}
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-900">{name}</p>
          <p className="mt-0.5 text-sm text-slate-500">{roleLabel}</p>
        </div>
        <p className="max-w-xs text-sm text-slate-500">{t("accMyQrHint")}</p>
      </CardBody>
    </Card>
  );
}
