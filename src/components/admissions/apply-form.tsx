"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Button, Card, CardBody, Input, Label, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type ProgramOption = { id: string; name: string; code: string | null };

export function ApplyForm({ programs }: { programs: ProgramOption[] }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [programId, setProgramId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || !programId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/admissions", {
        method: "POST",
        body: JSON.stringify({
          applicantName: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          school: school.trim() || null,
          note: note.trim() || null,
          programId,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("qblApplyError"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            ✓
          </span>
          <p className="text-base font-semibold text-emerald-800">{t("qblApplySuccess")}</p>
          <Button
            variant="secondary"
            className="mt-1"
            onClick={() => {
              setDone(false);
              setName("");
              setPhone("");
              setEmail("");
              setSchool("");
              setNote("");
              setProgramId("");
            }}
          >
            {t("qblApplyAgain")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label>{t("qblApplyName")}</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("qblApplyNamePlaceholder")}
              required
              minLength={3}
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("qblApplyPhone")}</Label>
              <Input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t("qblApplyPhonePlaceholder")}
                required
                minLength={7}
                maxLength={30}
              />
            </div>
            <div>
              <Label>{t("qblApplyEmail")}</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={160}
                aria-label={t("qblApplyEmail")}
              />
            </div>
          </div>
          <div>
            <Label>{t("qblApplySchool")}</Label>
            <Input
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder={t("qblApplySchoolPlaceholder")}
              maxLength={160}
            />
          </div>
          <div>
            <Label>{t("qblApplyProgram")}</Label>
            <Select
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              required
              aria-label={t("qblApplyProgram")}
            >
              <option value="">{t("qblApplyProgramPlaceholder")}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                  {program.code ? ` (${program.code})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("qblApplyNote")}</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={1000}
              aria-label={t("qblApplyNote")}
            />
          </div>
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700">{error}</p>
          ) : null}
          <Button type="submit" className="w-full justify-center" disabled={busy || !programId}>
            {busy ? t("qblApplySubmitting") : t("qblApplySubmit")}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
