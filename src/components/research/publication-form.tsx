"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

const KINDS = ["ARTICLE", "CONFERENCE", "MONOGRAPH", "PATENT", "TEXTBOOK"] as const;
const STATUSES = ["DRAFT", "SUBMITTED", "PUBLISHED"] as const;
const INDEXINGS = ["NONE", "SCOPUS", "WOS", "RINC", "LOCAL"] as const;

type FormValues = {
  title: string;
  kind: (typeof KINDS)[number];
  status: (typeof STATUSES)[number];
  indexing: (typeof INDEXINGS)[number];
  authors: string;
  journal: string;
  year: string;
  doi: string;
  url: string;
  note: string;
};

const emptyValues: FormValues = {
  title: "",
  kind: "ARTICLE",
  status: "DRAFT",
  indexing: "NONE",
  authors: "",
  journal: "",
  year: "",
  doi: "",
  url: "",
  note: "",
};

export function PublicationForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t("resAdd")}
      </Button>
    );
  }

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "same-origin",
      });
      const csrfJson = (await csrfResponse.json()) as { token?: string };
      const token = csrfJson.token;
      const response = await fetch("/api/publications", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": token ?? "",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          ...values,
          year: values.year.trim() === "" ? undefined : Number(values.year),
        }),
      });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !json?.ok) {
        setError(json?.error ?? t("resError"));
        return;
      }
      setValues(emptyValues);
      router.refresh();
    } catch {
      setError(t("resError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("resAdd")}
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {t("commonCancel")}
          </Button>
        }
      />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>{t("resFieldTitle")}</Label>
            <Input
              value={values.title}
              maxLength={300}
              required
              onChange={(event) => set("title", event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{t("resFieldKind")}</Label>
              <Select
                value={values.kind}
                onChange={(event) =>
                  set("kind", event.target.value as (typeof KINDS)[number])
                }
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(kindLabelKey(kind))}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("resFieldStatus")}</Label>
              <Select
                value={values.status}
                onChange={(event) =>
                  set("status", event.target.value as (typeof STATUSES)[number])
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(statusLabelKey(status))}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t("resFieldIndexing")}</Label>
              <Select
                value={values.indexing}
                onChange={(event) =>
                  set("indexing", event.target.value as (typeof INDEXINGS)[number])
                }
              >
                {INDEXINGS.map((indexing) => (
                  <option key={indexing} value={indexing}>
                    {t(indexingLabelKey(indexing))}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("resFieldAuthors")}</Label>
              <Input
                value={values.authors}
                maxLength={300}
                onChange={(event) => set("authors", event.target.value)}
              />
            </div>
            <div>
              <Label>{t("resFieldJournal")}</Label>
              <Input
                value={values.journal}
                maxLength={200}
                onChange={(event) => set("journal", event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{t("resFieldYear")}</Label>
              <Input
                type="number"
                min={1900}
                max={2100}
                value={values.year}
                onChange={(event) => set("year", event.target.value)}
              />
            </div>
            <div>
              <Label>{t("resFieldDoi")}</Label>
              <Input
                value={values.doi}
                maxLength={100}
                onChange={(event) => set("doi", event.target.value)}
              />
            </div>
            <div>
              <Label>{t("resFieldUrl")}</Label>
              <Input
                value={values.url}
                maxLength={500}
                onChange={(event) => set("url", event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t("resFieldNote")}</Label>
            <Textarea
              rows={3}
              maxLength={1000}
              value={values.note}
              onChange={(event) => set("note", event.target.value)}
            />
          </div>
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={busy} className="min-w-40">
              {busy ? t("resSaving") : t("resSave")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function kindLabelKey(kind: (typeof KINDS)[number]) {
  switch (kind) {
    case "ARTICLE":
      return "resKindArticle";
    case "CONFERENCE":
      return "resKindConference";
    case "MONOGRAPH":
      return "resKindMonograph";
    case "PATENT":
      return "resKindPatent";
    case "TEXTBOOK":
      return "resKindTextbook";
  }
}

function statusLabelKey(status: (typeof STATUSES)[number]) {
  switch (status) {
    case "DRAFT":
      return "resStatusDraft";
    case "SUBMITTED":
      return "resStatusSubmitted";
    case "PUBLISHED":
      return "resStatusPublished";
  }
}

function indexingLabelKey(indexing: (typeof INDEXINGS)[number]) {
  switch (indexing) {
    case "NONE":
      return "resIndexNone";
    case "LOCAL":
      return "resIndexLocal";
    case "RINC":
      return "resIndexRinc";
    case "SCOPUS":
      return "resIndexScopus";
    case "WOS":
      return "resIndexWos";
  }
}
