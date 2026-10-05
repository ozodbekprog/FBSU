"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function ForumReplyDelete({ replyId }: { replyId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("msgConfirmDeleteReply"))) return;
    setDeleting(true);
    await fetch(`/api/forum/replies/${replyId}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-slate-600 hover:text-rose-600"
      onClick={handleDelete}
      disabled={deleting}
    >
      {t("msgDelete")}
    </Button>
  );
}
