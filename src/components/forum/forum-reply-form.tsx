"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function ForumReplyForm({ topicId }: { topicId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/forum/${topicId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    setSaving(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("msgSubmitError"));
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title={t("msgWriteReply")} subtitle={t("msgShareOpinion")} />
      <CardBody>
        <form onSubmit={handleSubmit}>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={10000}
            required
            placeholder={t("msgReplyPlaceholder")}
          />
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? t("msgSubmitting") : t("msgSendReply")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
