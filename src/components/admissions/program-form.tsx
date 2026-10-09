"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function ProgramForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quota, setQuota] = useState("25");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admission-programs", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || null,
          quota: Number(quota) || 25,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("commonError"));
        return;
      }
      setName("");
      setCode("");
      setQuota("25");
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>{t("qblAddProgram")}</Button>;
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={onSubmit}>
      <div className="min-w-44">
        <Label>{t("qblProgramName")}</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} required minLength={3} />
      </div>
      <div className="w-28">
        <Label>{t("qblProgramCode")}</Label>
        <Input value={code} onChange={(event) => setCode(event.target.value)} maxLength={20} />
      </div>
      <div className="w-24">
        <Label>{t("qblQuota")}</Label>
        <Input
          type="number"
          min={1}
          max={2000}
          value={quota}
          onChange={(event) => setQuota(event.target.value)}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {t("commonSave")}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
        {t("commonCancel")}
      </Button>
      {error ? <p className="w-full text-xs font-medium text-rose-600">{error}</p> : null}
    </form>
  );
}
