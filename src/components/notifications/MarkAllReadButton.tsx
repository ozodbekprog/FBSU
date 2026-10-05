"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ensureCsrfToken } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function MarkAllReadButton() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAll() {
    setLoading(true);
    setError(null);
    try {
      const token = await ensureCsrfToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-csrf-token"] = token;
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ all: true }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("commonError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={markAll} disabled={loading}>
        {loading ? (
          t("msgMarking")
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t("msgMarkAllRead")}
          </>
        )}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
