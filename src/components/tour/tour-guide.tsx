"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/uz";

export const TOUR_DONE_KEY = "fbsu-tour-student-v1";

const AUTO_START_DELAY_MS = 900;
const TARGET_POLL_INTERVAL_MS = 250;
const TARGET_POLL_ATTEMPTS = 12;
const MEDIA_QUERY = "(max-width: 767px)";

type TourStep = {
  id: string;
  titleKey: keyof Dictionary;
  textKey: keyof Dictionary;
  desktopSelector?: string;
  mobileSelector?: string;
};

const STEPS: TourStep[] = [
  { id: "welcome", titleKey: "tourWelcomeTitle", textKey: "tourWelcomeText" },
  {
    id: "nav",
    titleKey: "tourNavTitle",
    textKey: "tourNavText",
    desktopSelector: '[data-nav-link][href="/courses"]',
    mobileSelector: '[data-tour="mobile-nav"]',
  },
  {
    id: "checkin",
    titleKey: "tourCheckinTitle",
    textKey: "tourCheckinText",
    desktopSelector: '[data-tour="dash-checkin"]',
  },
  {
    id: "actions",
    titleKey: "tourActionsTitle",
    textKey: "tourActionsText",
    desktopSelector: '[data-tour="dash-actions"]',
  },
  {
    id: "stats",
    titleKey: "tourStatsTitle",
    textKey: "tourStatsText",
    desktopSelector: '[data-tour="dash-stats"]',
  },
  {
    id: "lessons",
    titleKey: "tourLessonsTitle",
    textKey: "tourLessonsText",
    desktopSelector: '[data-tour="dash-lessons"]',
  },
  {
    id: "ai",
    titleKey: "tourAiTitle",
    textKey: "tourAiText",
    desktopSelector: '[data-tour="ai-assistant"]',
  },
  { id: "done", titleKey: "tourDoneTitle", textKey: "tourDoneText" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const emptySubscribe = () => () => void 0;

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function TourGuide({ role }: { role: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const mounted = useMounted();
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MEDIA_QUERY).matches,
  );
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tipSize, setTipSize] = useState({ width: 340, height: 210 });
  const tipRef = useRef<HTMLDivElement | null>(null);

  const step = running && pathname === "/dashboard" ? STEPS[stepIndex] : null;

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_DONE_KEY, String(Date.now()));
    } catch {
      void 0;
    }
    setRunning(false);
    setRect(null);
  }, []);

  useEffect(() => {
    const query = window.matchMedia(MEDIA_QUERY);
    const sync = () => setMobile(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!mounted || role !== "STUDENT" || pathname !== "/dashboard" || running) return;
    try {
      if (window.localStorage.getItem(TOUR_DONE_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setRunning(true);
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, role, pathname, running]);

  useEffect(() => {
    if (!step) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, finish]);

  const selector = useMemo(() => {
    if (!step) return undefined;
    return mobile
      ? step.mobileSelector ?? step.desktopSelector
      : step.desktopSelector ?? step.mobileSelector;
  }, [step, mobile]);

  useEffect(() => {
    if (!running || !step || !selector) return;

    let interval: number | undefined;
    let detach: (() => void) | undefined;

    const attach = (el: HTMLElement) => {
      const refresh = () => setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      refresh();
      const settle = window.setTimeout(refresh, 420);
      window.addEventListener("resize", refresh);
      window.addEventListener("scroll", refresh, true);
      detach = () => {
        window.clearTimeout(settle);
        window.removeEventListener("resize", refresh);
        window.removeEventListener("scroll", refresh, true);
      };
    };

    const immediate = document.querySelector<HTMLElement>(selector);
    if (immediate) {
      attach(immediate);
    } else {
      let attempts = 0;
      interval = window.setInterval(() => {
        const found = document.querySelector<HTMLElement>(selector);
        if (found) {
          window.clearInterval(interval);
          attach(found);
          return;
        }
        attempts += 1;
        if (attempts >= TARGET_POLL_ATTEMPTS) {
          window.clearInterval(interval);
          setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
        }
      }, TARGET_POLL_INTERVAL_MS);
    }

    return () => {
      if (interval) window.clearInterval(interval);
      detach?.();
    };
  }, [running, step, selector, stepIndex]);

  const activeRect = selector ? rect : null;

  useLayoutEffect(() => {
    if (!mounted || !running) return;
    const el = tipRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    setTipSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, [mounted, running, stepIndex, activeRect]);

  useEffect(() => {
    if (!running) return;
    tipRef.current?.focus({ preventScroll: true });
  }, [running, stepIndex]);

  const tooltipStyle = useMemo(() => {
    const width = 340;
    if (typeof window === "undefined") return { left: 0, top: 0, width };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 14;
    const resolvedWidth = Math.min(width, vw - margin * 2);
    if (!activeRect) {
      return {
        left: Math.max(margin, Math.round((vw - resolvedWidth) / 2)),
        top: Math.max(margin, Math.round((vh - tipSize.height) / 2)),
        width: resolvedWidth,
      };
    }
    const height = Math.max(tipSize.height, 150);
    const fitsRight = activeRect.right + gap + resolvedWidth <= vw - margin;
    const fitsLeft = activeRect.left - gap - resolvedWidth >= margin;
    const fitsBelow = activeRect.bottom + gap + height <= vh - margin;
    const fitsAbove = activeRect.top - gap - height >= margin;

    if (fitsRight) {
      return {
        left: activeRect.right + gap,
        top: clamp(activeRect.top + activeRect.height / 2 - height / 2, margin, vh - height - margin),
        width: resolvedWidth,
      };
    }
    if (fitsLeft) {
      return {
        left: activeRect.left - gap - resolvedWidth,
        top: clamp(activeRect.top + activeRect.height / 2 - height / 2, margin, vh - height - margin),
        width: resolvedWidth,
      };
    }
    const centeredLeft = clamp(
      activeRect.left + activeRect.width / 2 - resolvedWidth / 2,
      margin,
      vw - resolvedWidth - margin,
    );
    if (fitsBelow) {
      return { left: centeredLeft, top: activeRect.bottom + gap, width: resolvedWidth };
    }
    if (fitsAbove) {
      return { left: centeredLeft, top: activeRect.top - gap - height, width: resolvedWidth };
    }
    return {
      left: Math.max(margin, Math.round((vw - resolvedWidth) / 2)),
      top: Math.max(margin, Math.round((vh - height) / 2)),
      width: resolvedWidth,
    };
  }, [activeRect, tipSize]);

  const spotlightStyle = useMemo(() => {
    if (!activeRect) return undefined;
    const pad = 6;
    return {
      left: Math.max(0, activeRect.left - pad),
      top: Math.max(0, activeRect.top - pad),
      width: activeRect.width + pad * 2,
      height: activeRect.height + pad * 2,
    };
  }, [activeRect]);

  if (!mounted || !running || !step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <div className={cn("absolute inset-0", activeRect ? "bg-transparent" : "bg-slate-950/65")} />
      {spotlightStyle ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-1 ring-white/40 transition-[top,left,width,height] duration-300 ease-out"
          style={{ ...spotlightStyle, boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.65)" }}
        />
      ) : null}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(step.titleKey)}
        tabIndex={-1}
        className="absolute rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl outline-none"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">
            FBSU
          </span>
          <span className="text-[11px] font-medium tabular-nums text-slate-500">
            {t("tourStepCount", { current: stepIndex + 1, total: STEPS.length })}
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold tracking-tight text-slate-900">
          {t(step.titleKey)}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t(step.textKey)}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {isLast ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={finish}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              {t("tourSkip")}
            </button>
          )}
          <div className="flex items-center gap-2">
            {!isFirst && !isLast ? (
              <Button size="sm" variant="secondary" onClick={() => setStepIndex(stepIndex - 1)}>
                {t("tourPrev")}
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={() => {
                if (isLast) {
                  finish();
                  return;
                }
                setStepIndex(stepIndex + 1);
              }}
            >
              {isFirst ? t("tourStart") : isLast ? t("tourFinish") : t("tourNext")}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
