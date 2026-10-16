"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";
import type { ImageBlock } from "@/lib/openboard/types";
import { useI18n } from "@/components/i18n/LocaleProvider";

const MAX_SIDE = 1600;
const SMALL_SIDE = 1000;
const MAX_CHARS = 850_000;

function resize(img: HTMLImageElement, maxSide: number, quality: number): string {
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function ImageBlockEditor({
  block,
  onChange,
}: {
  block: ImageBlock;
  onChange: (next: ImageBlock) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let dataUrl = resize(img, MAX_SIDE, 0.85);
      if (dataUrl.length > MAX_CHARS) {
        dataUrl = resize(img, MAX_SIDE, 0.7);
      }
      if (dataUrl.length > MAX_CHARS) {
        dataUrl = resize(img, SMALL_SIDE, 0.7);
      }
      if (dataUrl.length > MAX_CHARS) {
        alert(t("brdImageError"));
        return;
      }
      onChange({ ...block, src: dataUrl, alt: file.name.slice(0, 2000) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert(t("brdImageError"));
    };
    img.src = url;
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      {block.src ? (
        <img
          src={block.src}
          alt={block.alt}
          className="max-w-full rounded-xl border border-slate-200"
        />
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
      >
        {block.src ? t("brdImageReplace") : t("brdImageAdd")}
      </button>
      <input
        value={block.caption ?? ""}
        placeholder={t("brdImageCaption")}
        maxLength={2000}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none"
      />
    </div>
  );
}
