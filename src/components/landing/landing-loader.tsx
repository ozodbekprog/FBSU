"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { BetaBadge } from "@/components/brand/beta-badge";

export function LandingLoader() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setGone(true), 1050);
    return () => window.clearTimeout(timer);
  }, []);

  if (gone) return null;

  return (
    <div
      className="landing-loader fixed inset-0 z-[100] grid place-items-center bg-[#07101f]"
      role="status"
      aria-label="FBSU yuklanmoqda"
    >
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3">
          <span className="inline-flex rounded-2xl bg-white p-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]">
            <Logo size={38} />
          </span>
          <BetaBadge onDark />
        </div>
        <div className="mt-7 h-px w-44 overflow-hidden bg-white/10">
          <span className="landing-loader-bar block h-full bg-gradient-to-r from-brand-400 via-gold-300 to-gold-400" />
        </div>
        <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.32em] text-white/35">
          Turin Polytechnic University
        </p>
      </div>
    </div>
  );
}
