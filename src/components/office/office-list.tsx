"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, CardBody, EmptyState } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { OfficeSummary, OfficeType } from "@/lib/office";
import { OfficeIcon } from "@/components/office/office-icon";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };

const TYPE_STYLES: Record<OfficeType, { tile: string; ring: string; button: string }> = {
  word: { tile: "bg-sky-50 text-sky-600", ring: "group-hover:ring-sky-200", button: "bg-sky-600 hover:bg-sky-700" },
  sheets: {
    tile: "bg-emerald-50 text-emerald-600",
    ring: "group-hover:ring-emerald-200",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
  slides: {
    tile: "bg-amber-50 text-amber-600",
    ring: "group-hover:ring-amber-200",
    button: "bg-amber-500 hover:bg-amber-600",
  },
};

const TYPE_ORDER: OfficeType[] = ["word", "sheets", "slides"];

export function OfficeList({ items }: { items: OfficeSummary[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [creating, setCreating] = useState<OfficeType | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = (type: OfficeType) =>
    type === "word" ? t("ofsWord") : type === "sheets" ? t("ofsSheets") : t("ofsSlides");

  const newLabel = (type: OfficeType) =>
    type === "word" ? t("ofsNewWord") : type === "sheets" ? t("ofsNewSheets") : t("ofsNewSlides");

  async function create(type: OfficeType) {
    setCreating(type);
    setError(null);
    try {
      const response = await apiFetch("/api/office", {
        method: "POST",
        body: JSON.stringify({ type, title: newLabel(type) }),
      });
      const payload = (await response.json().catch(() => null)) as ApiResult<OfficeSummary> | null;
      if (!response.ok || !payload || !payload.ok) {
        throw new Error(payload && !payload.ok ? payload.error : t("commonError"));
      }
      router.push(`/office/${payload.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("commonError"));
      setCreating(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("ofsConfirmDelete"))) return;
    setDeleting(id);
    setError(null);
    try {
      const response = await apiFetch(`/api/office/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(t("commonError"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("commonError"));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {TYPE_ORDER.map((type) => {
          const style = TYPE_STYLES[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => void create(type)}
              disabled={creating !== null}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition ${style.tile} ${style.ring}`}
              >
                <OfficeIcon type={type} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-brand-950">{newLabel(type)}</span>
                <span className="block truncate text-xs text-slate-500">{typeLabel(type)}</span>
              </span>
              <span className="ml-auto text-xl leading-none text-slate-300 transition group-hover:text-slate-500">
                +
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState title={t("ofsTitle")} description={t("ofsEmpty")} />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const style = TYPE_STYLES[item.type];
            return (
              <Card key={item.id} className="flex h-full flex-col">
                <CardBody className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.tile}`}
                    >
                      <OfficeIcon type={item.type} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-950">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{typeLabel(item.type)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {t("ofsUpdated")}: {fmtDateTime(item.updatedAt)}
                  </p>
                  <div className="mt-auto flex items-center gap-2">
                    <ButtonLink href={`/office/${item.id}`} size="sm" variant="secondary" className="flex-1">
                      {t("ofsOpen")}
                    </ButtonLink>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      disabled={deleting === item.id}
                      onClick={() => void remove(item.id)}
                    >
                      {deleting === item.id ? "..." : t("ofsDelete")}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
