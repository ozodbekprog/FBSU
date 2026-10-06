"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Badge } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { useThemeMode } from "@/components/theme/ThemeToggle";
import { apiFetch } from "@/lib/api";

type StoredElement = Record<string, unknown>;
type BoardData = { v: 2; kind: "excalidraw"; elements: StoredElement[] };

type InitialData = NonNullable<ComponentProps<typeof Excalidraw>["initialData"]>;

export function BoardCanvas({ assignmentId }: { assignmentId: string | null }) {
  const { t, locale } = useI18n();
  const theme = useThemeMode();
  const [elements, setElements] = useState<StoredElement[] | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const latestRef = useRef<StoredElement[]>([]);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const query = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : "";
      const response = await apiFetch(`/api/board${query}`);
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { data: unknown } }
        | null;
      if (!active) return;
      const data = json?.data?.data as BoardData | null;
      const loaded =
        data && data.kind === "excalidraw" && Array.isArray(data.elements) ? data.elements : [];
      latestRef.current = loaded;
      setElements(loaded);
      setStatus("idle");
    })();
    return () => {
      active = false;
    };
  }, [assignmentId]);

  const save = useMemo(
    () => async () => {
      if (!dirtyRef.current) return;
      setStatus("saving");
      const payload: BoardData = { v: 2, kind: "excalidraw", elements: latestRef.current };
      const response = await apiFetch("/api/board", {
        method: "PUT",
        body: JSON.stringify({ assignmentId, data: payload }),
      });
      const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (response.ok && json?.ok) {
        dirtyRef.current = false;
        setStatus("saved");
      } else {
        setStatus("error");
      }
    },
    [assignmentId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      void save();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [save]);

  const initialData = useMemo<InitialData>(
    () =>
      ({
        elements: elements ?? [],
        appState: {
          viewBackgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
          currentItemStrokeColor: theme === "dark" ? "#e2e8f0" : "#0f172a",
        },
      }) as unknown as InitialData,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elements === null],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {t("brdHint")} · {t("brdAutosaveHint")}
        </p>
        {status === "saving" ? (
          <Badge tone="amber">{t("brdSaving")}</Badge>
        ) : status === "saved" ? (
          <Badge tone="green">{t("brdSaved")}</Badge>
        ) : status === "error" ? (
          <Badge tone="rose">{t("brdSaveError")}</Badge>
        ) : status === "loading" ? (
          <Badge tone="slate">{t("commonLoading")}</Badge>
        ) : null}
      </div>
      <div className="relative h-[72vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {elements === null ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
            {t("commonLoading")}
          </div>
        ) : (
          <Excalidraw
            initialData={initialData}
            theme={theme}
            langCode={locale === "ru" ? "ru" : "en"}
            onChange={(nextElements) => {
              latestRef.current = nextElements as unknown as StoredElement[];
              dirtyRef.current = true;
              setStatus((current) => (current === "saving" ? current : "idle"));
            }}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
                export: { saveFileToDisk: true },
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
