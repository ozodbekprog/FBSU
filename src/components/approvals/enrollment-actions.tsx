"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ensureCsrfToken } from "@/lib/api";

export function EnrollmentActions({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const token = await ensureCsrfToken();
    const response = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify({ action }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    setBusy(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? "Xatolik yuz berdi");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void act("approve")}>
          Tasdiqlash
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act("reject")}>
          Rad etish
        </Button>
      </div>
      {error ? <p className="max-w-56 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
