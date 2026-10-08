"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { HelpSection } from "@/components/help/section";
import { TOUR_DONE_KEY } from "./tour-guide";

export function TourRestart() {
  const { t } = useI18n();
  const router = useRouter();

  function restart() {
    try {
      window.localStorage.removeItem(TOUR_DONE_KEY);
    } catch {
      void 0;
    }
    router.push("/dashboard");
  }

  return (
    <HelpSection
      id="tur"
      icon="sparkles"
      title={t("tourRestartTitle")}
      description={t("tourRestartText")}
    >
      <Button onClick={restart}>{t("tourRestartButton")}</Button>
    </HelpSection>
  );
}
