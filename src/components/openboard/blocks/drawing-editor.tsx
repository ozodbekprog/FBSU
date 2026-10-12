"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { useThemeMode } from "@/components/theme/ThemeToggle";
import type { DrawingBlock } from "@/lib/openboard/types";

type InitialData = NonNullable<ComponentProps<typeof Excalidraw>["initialData"]>;

export type DrawingSave = Pick<DrawingBlock, "scene" | "sceneAppState" | "preview">;

type ExportToBlobOptions = {
  elements: readonly ExcalidrawElement[];
  appState?: { exportBackground?: boolean; viewBackgroundColor?: string };
  files: BinaryFiles | null;
  mimeType?: string;
  quality?: number;
  getDimensions?: (
    width: number,
    height: number,
  ) => { width: number; height: number; scale?: number };
};

const exportBlob = exportToBlob as unknown as (
  options: ExportToBlobOptions,
) => Promise<Blob>;

const MAX_PREVIEW_BYTES = 380_000;
const SCALES = [0.5, 0.3] as const;

function backgroundOf(block: DrawingBlock): string {
  const stored = block.sceneAppState?.viewBackgroundColor;
  return typeof stored === "string" && stored.length > 0 ? stored : "#ffffff";
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("preview"));
    reader.readAsDataURL(blob);
  });
}

export function DrawingEditor({
  block,
  onSave,
  onClose,
}: {
  block: DrawingBlock;
  onSave: (next: DrawingSave) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const theme = useThemeMode();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [busy, setBusy] = useState(false);

  const handleApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);

  const initialData = useMemo<InitialData>(
    () =>
      ({
        elements: block.scene,
        appState: { viewBackgroundColor: backgroundOf(block) },
      }) as unknown as InitialData,
    [block],
  );

  const handleClear = () => {
    if (!window.confirm(t("brdClearConfirm"))) return;
    apiRef.current?.updateScene({ elements: [] });
  };

  const handleDone = async () => {
    const api = apiRef.current;
    if (!api || busy) return;
    setBusy(true);
    try {
      const elements = api.getSceneElements();
      const files = api.getFiles();
      const viewBackgroundColor = api.getAppState().viewBackgroundColor || backgroundOf(block);

      const render = (scale: number) =>
        exportBlob({
          elements,
          appState: { exportBackground: true, viewBackgroundColor },
          files,
          mimeType: "image/png",
          quality: 0.8,
          getDimensions: (width: number, height: number) => ({
            width: Math.max(1, Math.round(width * scale)),
            height: Math.max(1, Math.round(height * scale)),
            scale,
          }),
        });

      let blob = await render(SCALES[0]);
      if (blob.size > MAX_PREVIEW_BYTES) {
        blob = await render(SCALES[1]);
      }

      onSave({
        scene: elements as unknown as DrawingBlock["scene"],
        sceneAppState: { viewBackgroundColor },
        preview: await toDataUrl(blob),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500">{t("brdHint")}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              {t("brdClear")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              {t("brdClose")}
            </button>
            <button
              type="button"
              onClick={() => void handleDone()}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t("brdDrawDone")}
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <Excalidraw
            excalidrawAPI={handleApi}
            initialData={initialData}
            theme={theme}
            langCode={locale === "ru" ? "ru" : "en"}
          />
        </div>
      </div>
    </div>
  );
}
