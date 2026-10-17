"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type SimilarityResponse = {
  ok: boolean;
  data: {
    total: number;
    pairs: Array<{ aId: string; bId: string; score: number }>;
    bySubmission: Record<string, number>;
  };
};

type Phase = "idle" | "loading" | "error" | "done";

export function SimilarityPanel({
  assignmentId,
  names,
}: {
  assignmentId: string;
  names: Record<string, string>;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [total, setTotal] = useState(0);
  const [pairs, setPairs] = useState<Array<{ aId: string; bId: string; score: number }>>([]);

  async function check() {
    setPhase("loading");
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/similarity`, {
        credentials: "same-origin",
      });
      const json = (await response.json().catch(() => null)) as SimilarityResponse | null;
      if (!response.ok || !json?.ok) {
        setPhase("error");
        return;
      }
      setTotal(json.data.total);
      setPairs(json.data.pairs);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  const tone = (score: number) => (score >= 0.7 ? "rose" : score >= 0.5 ? "amber" : "slate");

  return (
    <Card className="animate-fade-up">
      <CardHeader title={t("simTitle")} subtitle={t("simSubtitle")} />
      <CardBody className="space-y-4">
        <Button
          variant="secondary"
          onClick={() => void check()}
          disabled={phase === "loading"}
        >
          {phase === "loading" ? t("simChecking") : t("simCheck")}
        </Button>

        {phase === "loading" ? (
          <p className="text-sm text-slate-500">Yuklanmoqda...</p>
        ) : null}

        {phase === "error" ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {t("simError")}
          </p>
        ) : null}

        {phase === "done" ? (
          total < 2 ? (
            <EmptyState title={t("simTooFew")} />
          ) : pairs.length === 0 ? (
            <Badge tone="green">{t("simNoPairs")}</Badge>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">{t("simPairsFound", { count: pairs.length })}</Badge>
                <span className="text-xs text-slate-500">
                  {t("simChecked", { count: total })}
                </span>
              </div>
              <ul className="space-y-2">
                {pairs.map((pair) => (
                  <li
                    key={`${pair.aId}-${pair.bId}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3"
                  >
                    <span className="min-w-0 truncate text-sm text-slate-700">
                      {names[pair.aId] ?? pair.aId}
                      <span className="mx-1.5 text-slate-500">↔</span>
                      {names[pair.bId] ?? pair.bId}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-slate-500">{t("simScore")}</span>
                      <Badge tone={tone(pair.score)}>{Math.round(pair.score * 100)}%</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </CardBody>
    </Card>
  );
}
