"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export function MaterialCompleteButton({
  materialId,
  initialCompleted,
}: {
  materialId: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markComplete() {
    if (completed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/completion", {
        method: "POST",
        body: JSON.stringify({ targetType: "MATERIAL", targetId: materialId }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Belgilashda xatolik yuz berdi");
        return;
      }
      setCompleted(true);
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring");
    } finally {
      setBusy(false);
    }
  }

  if (completed) {
    return <Badge tone="green">Bajarildi ✓</Badge>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" disabled={busy} onClick={markComplete}>
        {busy ? "Belgilanmoqda..." : "Bajarildi deb belgilash"}
      </Button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
