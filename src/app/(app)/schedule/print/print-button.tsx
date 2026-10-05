"use client";

import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button onClick={() => window.print()}>
      <svg
        className="size-4"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9V3h12v6" />
        <rect x="4" y="9" width="16" height="8" rx="2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      {t("schPrint")}
    </Button>
  );
}
