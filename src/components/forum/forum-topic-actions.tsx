"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function ForumTopicActions({
  topicId,
  isPinned,
  canPin,
  canDelete,
  redirectTo,
}: {
  topicId: string;
  isPinned: boolean;
  canPin: boolean;
  canDelete: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function togglePin() {
    setPinning(true);
    setError(null);

    const response = await fetch(`/api/forum/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !isPinned }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    setPinning(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("msgActionError"));
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(t("msgConfirmDeleteTopic"))) return;
    setDeleting(true);
    const response = await fetch(`/api/forum/${topicId}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? t("msgDeleteError"));
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (!canPin && !canDelete) return null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex gap-2">
        {canPin ? (
          <Button size="sm" variant="secondary" onClick={togglePin} disabled={pinning}>
            {isPinned ? t("msgUnpin") : t("msgPin")}
          </Button>
        ) : null}
        {canDelete ? (
          <Button size="sm" variant="danger" onClick={handleDelete} disabled={deleting}>
            {t("msgDelete")}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
