"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export const ADMIN_WIDGETS = ["stats", "quick", "upload", "charts", "recent"] as const;
export type AdminWidget = (typeof ADMIN_WIDGETS)[number];

const WIDGET_LABEL_KEYS: Record<AdminWidget, "admPanelWStats" | "admPanelWQuick" | "admPanelWUpload" | "admPanelWCharts" | "admPanelWRecent"> = {
  stats: "admPanelWStats",
  quick: "admPanelWQuick",
  upload: "admPanelWUpload",
  charts: "admPanelWCharts",
  recent: "admPanelWRecent",
};

export function AdminPanelConfig({ hidden }: { hidden: AdminWidget[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hiddenSet, setHiddenSet] = useState<Set<AdminWidget>>(new Set(hidden));

  async function save(next: Set<AdminWidget>) {
    setBusy(true);
    try {
      await apiFetch("/api/admin/preferences", {
        method: "PATCH",
        body: JSON.stringify({ hidden: [...next] }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function toggle(widget: AdminWidget) {
    const next = new Set(hiddenSet);
    if (next.has(widget)) next.delete(widget);
    else next.add(widget);
    setHiddenSet(next);
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1.5"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {t("admPanelConfig")}
      </Button>
      {open ? (
        <div className="animate-fade-up absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{t("admPanelConfig")}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("admPanelConfigHint")}</p>
          <div className="mt-3 space-y-2">
            {ADMIN_WIDGETS.map((widget) => {
              const visible = !hiddenSet.has(widget);
              return (
                <label
                  key={widget}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/70 px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-700">{t(WIDGET_LABEL_KEYS[widget])}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    aria-label={t(WIDGET_LABEL_KEYS[widget])}
                    onClick={() => toggle(widget)}
                    className={
                      visible
                        ? "relative h-6 w-11 shrink-0 rounded-full bg-emerald-500 transition-colors"
                        : "relative h-6 w-11 shrink-0 rounded-full bg-slate-200 transition-colors"
                    }
                  >
                    <span
                      className={
                        visible
                          ? "absolute top-0.5 left-5.5 size-5 rounded-full bg-white shadow transition-[left]"
                          : "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-[left]"
                      }
                    />
                  </button>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              {t("commonCancel")}
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                void save(hiddenSet);
                setOpen(false);
              }}
            >
              {t("commonSave")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
