"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __fbMotion?: boolean;
  }
}

type FbMotionProps = {
  variant: "landing" | "dashboard";
};

function formatCount(value: number, decimals: number, pad: number) {
  const [integer, fraction] = value.toFixed(decimals).split(".");
  let head = integer;
  if (pad > 0) {
    head = head.padStart(pad, "0");
  } else if (head.length > 3) {
    head = head.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return fraction ? `${head}.${fraction}` : head;
}

function animateCount(el: HTMLElement) {
  const target = Number.parseFloat(el.dataset.fbCount ?? "");
  if (!Number.isFinite(target)) return;
  const decimals = Number(el.dataset.fbDecimals ?? 0);
  const pad = Number(el.dataset.fbPad ?? 0);
  const finish = () => {
    el.textContent = formatCount(target, decimals, pad);
  };
  if (el.dataset.fbDone === "true") return;
  el.dataset.fbDone = "true";

  const duration = 1500;
  const started = performance.now() + (el.closest(".fb-float") ? 1100 : 80);
  const tick = (now: number) => {
    const progress = Math.min(1, Math.max(0, (now - started) / duration));
    const eased = 1 - Math.pow(2, -10 * progress);
    el.textContent = formatCount(target * eased, decimals, pad);
    if (progress < 1) requestAnimationFrame(tick);
    else finish();
  };
  el.textContent = formatCount(0, decimals, pad);
  requestAnimationFrame(tick);
}

export function FbMotion({ variant }: FbMotionProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-fb-root="${variant}"]`);
    if (!root) return;
    window.__fbMotion = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-fb-reveal]"));
    const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-fb-count]"));

    root.querySelectorAll<SVGPathElement>(".fb-spark path").forEach((path) => {
      path.setAttribute("pathLength", "1");
    });

    for (const el of reveals) {
      el.classList.add("fb-reveal");
    }

    const revealNow = (el: HTMLElement) => el.classList.add("is-in");

    if (reduce) {
      reveals.forEach(revealNow);
      counters.forEach((el) => {
        const target = Number.parseFloat(el.dataset.fbCount ?? "");
        if (!Number.isFinite(target)) return;
        el.textContent = formatCount(
          target,
          Number(el.dataset.fbDecimals ?? 0),
          Number(el.dataset.fbPad ?? 0),
        );
      });
      root.classList.add("is-loaded", "is-settled");
      root.querySelectorAll<HTMLElement>(".fb-mark").forEach((el) => el.classList.add("is-in"));
      root.querySelectorAll<HTMLElement>("[data-fb-daygrid]").forEach((el) =>
        el.classList.add("is-in"),
      );
    } else {
      const observer =
        "IntersectionObserver" in window
          ? new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (!entry.isIntersecting) return;
                  const el = entry.target as HTMLElement;
                  observer?.unobserve(el);
                  const delay = Number(el.dataset.fbDelay ?? 0);
                  if (delay > 0) window.setTimeout(() => revealNow(el), delay);
                  else revealNow(el);
                });
              },
              { threshold: 0.1, rootMargin: "0px 0px 0px 0px" },
            )
          : null;

      if (observer) {
        reveals.forEach((el) => observer.observe(el));
      } else {
        reveals.forEach(revealNow);
      }

      const countObserver =
        "IntersectionObserver" in window
          ? new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (!entry.isIntersecting) return;
                  countObserver?.unobserve(entry.target);
                  animateCount(entry.target as HTMLElement);
                });
              },
              { threshold: 0.4, rootMargin: "0px 0px 0px 0px" },
            )
          : null;
      if (countObserver) counters.forEach((el) => countObserver.observe(el));
      else counters.forEach(animateCount);

      const quoteMark = root.querySelector<HTMLElement>(".fb-mark");
      if (quoteMark && observer) observer.observe(quoteMark);

      const dayGrid = root.querySelector<HTMLElement>("[data-fb-daygrid]");
      if (dayGrid && observer) observer.observe(dayGrid);

      if (variant === "landing") {
        const fonts =
          document.fonts && document.fonts.ready
            ? document.fonts.ready
            : Promise.resolve();
        Promise.race([fonts, new Promise((resolve) => window.setTimeout(resolve, 700))]).then(
          () => {
            window.setTimeout(() => root.classList.add("is-loaded"), 60);
          },
        );
        window.setTimeout(() => root.classList.add("is-settled"), 2500);
      } else {
        requestAnimationFrame(() => root.classList.add("is-loaded"));
      }
    }

    if (variant !== "landing") {
      return () => {
        root.classList.remove("is-loaded");
      };
    }

    const nav = root.querySelector<HTMLElement>(".fb-gnav");
    const stage = root.querySelector<HTMLElement>(".fb-stage");

    const onScroll = () => {
      const y = window.scrollY || 0;
      nav?.classList.toggle("is-scrolled", y > 10);
      if (nav) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        nav.style.setProperty("--fb-prog", max > 0 ? Math.min(1, y / max).toFixed(4) : "0");
      }
      if (stage && !reduce) {
        const t = Math.min(1, Math.max(0, (y - 30) / 600));
        stage.style.setProperty("--tilt", `${(6.5 * (1 - t)).toFixed(2)}deg`);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const tiles = Array.from(root.querySelectorAll<HTMLElement>("[data-fb-spotlight]"));
    const onMove = (event: PointerEvent) => {
      const tile = event.currentTarget as HTMLElement;
      const rect = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      tile.style.setProperty("--my", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
    };
    tiles.forEach((tile) => tile.addEventListener("pointermove", onMove));

    return () => {
      window.removeEventListener("scroll", onScroll);
      tiles.forEach((tile) => tile.removeEventListener("pointermove", onMove));
    };
  }, [variant]);

  return null;
}
