"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TrafficAutoRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((value) => !value)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          enabled ? "animate-pulse bg-emerald-500" : "bg-slate-300",
        )}
      />
      {enabled ? "Avto 30s" : "Avtoyangilash"}
    </button>
  );
}
