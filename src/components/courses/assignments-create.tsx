"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function AssignmentsCreate({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await apiFetch(`/api/courses/${courseId}/assignments`, {
      method: "POST",
      body: JSON.stringify({
        title,
        description: description || null,
        dueAt: dueAt || null,
        maxScore: Number(maxScore),
      }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    setSaving(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("crsSaveError"));
      return;
    }

    setTitle("");
    setDescription("");
    setDueAt("");
    setMaxScore("100");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setOpen(true)} size="lg">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("crsNewAssignment")}
        </Button>
      </div>
    );
  }

  return (
    <Card className="animate-fade-up mb-6">
      <CardHeader
        title={t("crsNewAssignment")}
        subtitle={t("crsNewAssignmentSubtitle")}
        action={
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("crsClose")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        }
      />
      <CardBody>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{t("crsTitle")}</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
                placeholder={t("crsAssignmentTitlePlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("crsDescription")}</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder={t("crsAssignmentDescPlaceholder")}
                className="resize-y"
              />
            </div>
            <div>
              <Label>{t("crsDueDate")}</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
            <div>
              <Label>{t("crsMaxScore")}</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                required
              />
            </div>
          </div>
          {error ? (
            <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("crsCancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("crsSaving") : t("crsSave")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
