"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  SLIDE_THEMES,
  newSlide,
  type SlideItem,
  type SlideLayout,
  type SlideTheme,
  type SlidesBody,
} from "@/lib/office";

type Props = {
  initial: SlidesBody;
  onChange: (body: SlidesBody) => void;
};

const THEMES: SlideTheme[] = ["light", "navy", "forest", "cream"];

const PRINT_STYLES = `
.office-print-deck { display: none; }
@media print {
  .office-print-deck { display: block; }
  .office-print-slide { break-inside: avoid; page-break-inside: avoid; break-after: page; page-break-after: always; }
  .office-print-slide:last-child { break-after: auto; page-break-after: auto; }
}
`;

function SlideContent({ slide }: { slide: SlideItem }) {
  const palette = SLIDE_THEMES[slide.theme];
  const cover = slide.layout === "cover";
  return (
    <div
      className={cn("flex h-full w-full flex-col justify-center px-[7%] py-[6%]", cover ? "text-center" : "text-left")}
      style={{ background: palette.bg, color: palette.fg }}
    >
      {!cover ? <span className="mb-4 block h-1 w-14 rounded-full" style={{ background: palette.accent }} /> : null}
      <p className={cn("whitespace-pre-wrap font-semibold leading-tight", cover ? "text-3xl md:text-5xl" : "text-2xl md:text-4xl")}>
        {slide.title || " "}
      </p>
      <p
        className={cn("mt-4 whitespace-pre-wrap leading-relaxed", cover ? "text-base md:text-2xl" : "text-sm md:text-lg")}
        style={{ color: palette.muted }}
      >
        {slide.body || " "}
      </p>
    </div>
  );
}

export function SlidesEditor({ initial, onChange }: Props) {
  const { t } = useI18n();
  const [deck, setDeck] = useState<SlidesBody>(initial);
  const [selectedId, setSelectedId] = useState(initial.slides[0]?.id ?? "");
  const [presenting, setPresenting] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);

  const selectedIndex = Math.max(0, deck.slides.findIndex((slide) => slide.id === selectedId));
  const slide = deck.slides[selectedIndex] ?? deck.slides[0];
  const palette = SLIDE_THEMES[slide.theme];

  useEffect(() => {
    if (!presenting) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") {
        event.preventDefault();
        setPresentIndex((index) => Math.min(deck.slides.length - 1, index + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setPresentIndex((index) => Math.max(0, index - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, deck.slides.length]);

  function commit(next: SlidesBody) {
    setDeck(next);
    onChange(next);
  }

  function updateSlide(id: string, patch: Partial<SlideItem>) {
    commit({ ...deck, slides: deck.slides.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function addSlide() {
    const created = newSlide(slide.theme, "content");
    const next = [...deck.slides];
    next.splice(selectedIndex + 1, 0, created);
    commit({ ...deck, slides: next });
    setSelectedId(created.id);
  }

  function removeSlide() {
    if (deck.slides.length <= 1) return;
    const next = deck.slides.filter((item) => item.id !== selectedId);
    const nextIndex = Math.max(0, selectedIndex - 1);
    commit({ ...deck, slides: next });
    setSelectedId(next[nextIndex]?.id ?? next[0].id);
  }

  function moveSlide(direction: -1 | 1) {
    const target = selectedIndex + direction;
    if (target < 0 || target >= deck.slides.length) return;
    const next = [...deck.slides];
    const [moved] = next.splice(selectedIndex, 1);
    next.splice(target, 0, moved);
    commit({ ...deck, slides: next });
  }

  function present() {
    setPresentIndex(selectedIndex);
    setPresenting(true);
  }

  const current = deck.slides[presentIndex] ?? deck.slides[0];

  return (
    <div className="space-y-4">
      <style>{PRINT_STYLES}</style>

      <div className="office-no-print flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          {(["cover", "content"] as SlideLayout[]).map((layout) => (
            <button
              key={layout}
              type="button"
              onClick={() => updateSlide(slide.id, { layout })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                slide.layout === layout ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {layout === "cover" ? t("ofsCover") : t("ofsContent")}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-slate-400">{t("ofsTheme")}</span>
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => updateSlide(slide.id, { theme })}
              aria-label={theme}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition",
                slide.theme === theme ? "scale-110 border-brand-500" : "border-white shadow ring-1 ring-slate-200",
              )}
              style={{ background: SLIDE_THEMES[theme].bg }}
            />
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => moveSlide(-1)} disabled={selectedIndex === 0}>
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => moveSlide(1)}
            disabled={selectedIndex === deck.slides.length - 1}
          >
            ↓
          </Button>
          <Button size="sm" variant="secondary" onClick={addSlide}>
            {t("ofsAddSlide")}
          </Button>
          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={removeSlide} disabled={deck.slides.length <= 1}>
            {t("ofsDeleteSlide")}
          </Button>
          <Button size="sm" variant="gold" onClick={present}>
            {t("ofsPresent")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="office-no-print flex gap-2 overflow-x-auto pb-2 lg:w-48 lg:flex-col lg:overflow-y-auto lg:pb-0">
          {deck.slides.map((item, index) => {
            const itemPalette = SLIDE_THEMES[item.theme];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-xl border p-1.5 text-left transition lg:w-full",
                  item.id === slide.id ? "border-brand-400 bg-brand-50/60" : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span className="w-5 text-center text-[11px] font-semibold text-slate-400">{index + 1}</span>
                <span
                  className="flex h-12 w-20 shrink-0 flex-col justify-center rounded-md px-2 lg:h-14 lg:w-full"
                  style={{ background: itemPalette.bg, color: itemPalette.fg }}
                >
                  <span className="truncate text-[9px] font-semibold">{item.title || "—"}</span>
                  <span className="mt-0.5 h-0.5 w-5 rounded-full" style={{ background: itemPalette.accent }} />
                </span>
              </button>
            );
          })}
        </aside>

        <div className="min-w-0 flex-1">
          <div
            className="mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl shadow-[0_10px_40px_-12px_rgba(16,24,40,0.35)]"
            style={{ background: palette.bg, color: palette.fg }}
          >
            <div
              className={cn(
                "flex h-full flex-col justify-center px-[7%] py-[6%]",
                slide.layout === "cover" ? "text-center" : "text-left",
              )}
            >
              {slide.layout === "content" ? (
                <span className="mb-3 block h-1 w-12 rounded-full sm:mb-5 sm:w-16" style={{ background: palette.accent }} />
              ) : null}
              <textarea
                value={slide.title}
                onChange={(event) => updateSlide(slide.id, { title: event.target.value })}
                rows={2}
                placeholder={t("ofsSlideTitle")}
                className={cn(
                  "w-full resize-none bg-transparent font-semibold leading-tight outline-none placeholder:text-current placeholder:opacity-30",
                  slide.layout === "cover" ? "text-2xl sm:text-5xl" : "text-xl sm:text-4xl",
                )}
                style={{ color: palette.fg }}
              />
              <textarea
                value={slide.body}
                onChange={(event) => updateSlide(slide.id, { body: event.target.value })}
                rows={4}
                placeholder={t("ofsSlideBody")}
                className={cn(
                  "mt-3 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-current placeholder:opacity-30",
                  slide.layout === "cover" ? "text-sm sm:text-lg" : "text-xs sm:text-base",
                )}
                style={{ color: palette.muted }}
              />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">{t("ofsHintSlides")}</p>
        </div>
      </div>

      <div className="office-print-deck">
        {deck.slides.map((item) => {
          const itemPalette = SLIDE_THEMES[item.theme];
          return (
            <div
              key={item.id}
              className="office-print-slide flex flex-col justify-center"
              style={{
                background: itemPalette.bg,
                color: itemPalette.fg,
                padding: "12mm",
                minHeight: "160mm",
                marginBottom: "6mm",
              }}
            >
              <p style={{ fontSize: "26pt", fontWeight: 600, margin: 0 }}>{item.title}</p>
              <p style={{ fontSize: "14pt", marginTop: "8mm", color: itemPalette.muted, whiteSpace: "pre-wrap" }}>
                {item.body}
              </p>
            </div>
          );
        })}
      </div>

      {presenting && current ? (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black">
          <div className="flex items-center justify-between px-5 py-3 text-sm text-white/70">
            <span>
              {presentIndex + 1} / {deck.slides.length}
            </span>
            <button
              type="button"
              onClick={() => setPresenting(false)}
              className="rounded-lg px-3 py-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {t("ofsClosePresent")} ✕
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-6">
            <div className="aspect-video w-full max-w-6xl overflow-hidden rounded-xl" style={{ background: SLIDE_THEMES[current.theme].bg }}>
              <SlideContent slide={current} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pb-6">
            <button
              type="button"
              onClick={() => setPresentIndex((index) => Math.max(0, index - 1))}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              ← {t("ofsPrev")}
            </button>
            <button
              type="button"
              onClick={() => setPresentIndex((index) => Math.min(deck.slides.length - 1, index + 1))}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              {t("ofsNext")} →
            </button>
          </div>
          <p className="pb-4 text-center text-xs text-white/40">{t("ofsPresentHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
