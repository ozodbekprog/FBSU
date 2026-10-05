"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function AnnouncementsCreate({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/courses/${courseId}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    setSaving(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("msgSaveError"));
      return;
    }

    setTitle("");
    setBody("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>{t("msgNewAnnouncement")}</Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader
        title={t("msgNewAnnouncement")}
        subtitle={t("msgAnnouncementFormHint")}
      />
      <CardBody>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>{t("msgTitleLabel")}</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                placeholder={t("msgAnnouncementTitlePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("msgBodyLabel")}</Label>
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                maxLength={10000}
                required
                placeholder={t("msgAnnouncementBodyPlaceholder")}
              />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("commonCancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("msgSaving") : t("msgPublish")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
