"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type AnnouncementData = {
  id: string;
  title: string;
  body: string;
};

export function AnnouncementsActions({ announcement }: { announcement: AnnouncementData }) {
  const router = useRouter();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/announcements/${announcement.id}`, {
      method: "PATCH",
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

    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(t("msgConfirmDeleteAnnouncement"))) return;
    setDeleting(true);
    await fetch(`/api/announcements/${announcement.id}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing((value) => !value)}>
          {t("msgEdit")}
        </Button>
        <Button size="sm" variant="danger" onClick={handleDelete} disabled={deleting}>
          {t("msgDelete")}
        </Button>
      </div>
      {editing ? (
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="space-y-4">
            <div>
              <Label>{t("msgTitleLabel")}</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
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
              />
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              {t("commonCancel")}
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? t("msgSaving") : t("commonSave")}
            </Button>
          </div>
        </form>
      ) : null}
    </>
  );
}
