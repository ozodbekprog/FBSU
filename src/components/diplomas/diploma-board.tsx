"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { apiFetch } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Select,
  Table,
} from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type DiplomaStudent = {
  id: string;
  name: string;
  group: string | null;
};

export type DiplomaItem = {
  id: string;
  number: string;
  program: string;
  degree: string;
  gpa: number | null;
  issuedAt: string;
  verifyCode: string;
  student: { id: string; name: string; group: string | null };
};

type ApiResult<T> = { ok: boolean; error?: string; data?: T };

const DEGREES = ["Bakalavr", "Magistr"];

function DiplomaQr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 80, margin: 1, errorCorrectionLevel: "M" })
      .then((value) => {
        if (!cancelled) setSrc(value);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) {
    return <span className="block size-20 animate-pulse rounded-xl bg-slate-100" />;
  }
  return <img src={src} alt="QR" className="size-20 rounded-xl border border-slate-100 bg-white p-0.5" />;
}

export default function DiplomaBoard({
  diplomas,
  students,
  canManage,
}: {
  diplomas: DiplomaItem[];
  students: DiplomaStudent[];
  canManage: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [studentId, setStudentId] = useState("");
  const [program, setProgram] = useState("");
  const [degree, setDegree] = useState("Bakalavr");
  const [gpa, setGpa] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setOrigin(window.location.origin), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function verifyUrl(code: string) {
    return `${origin}/verify/${code}`;
  }

  async function copyLink(diploma: DiplomaItem) {
    try {
      await navigator.clipboard.writeText(verifyUrl(diploma.verifyCode));
      setCopiedId(diploma.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === diploma.id ? null : current));
      }, 2000);
    } catch {
      setError("Nusxalash imkoni bo'lmadi");
    }
  }

  async function createDiploma(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const gpaValue = gpa.trim() === "" ? null : Number(gpa);
    if (gpaValue !== null && (Number.isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4)) {
      setError(t("dipGpa") + " 0 — 4 oralig'ida bo'lishi kerak");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/diplomas", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          program: program.trim(),
          degree,
          gpa: gpaValue,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<DiplomaItem> | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      setStudentId("");
      setProgram("");
      setDegree("Bakalavr");
      setGpa("");
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {canManage ? (
        <Card>
          <CardHeader title={t("dipCreate")} subtitle={t("dipSubtitle")} />
          <CardBody>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={createDiploma}>
              <div>
                <Label>{t("dipStudent")}</Label>
                <Select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.group ? ` — ${student.group}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("dipProgram")}</Label>
                <Input
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  required
                  minLength={3}
                  maxLength={120}
                />
              </div>
              <div>
                <Label>{t("dipDegree")}</Label>
                <Select value={degree} onChange={(e) => setDegree(e.target.value)}>
                  {DEGREES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("dipGpa")}</Label>
                <Input
                  type="number"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  min={0}
                  max={4}
                  step={0.01}
                  placeholder="0 — 4"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={busy || !studentId || program.trim().length < 3}
                >
                  {t("dipCreate")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader title={t("dipTitle")} subtitle={diplomas.length} />
        <CardBody>
          {diplomas.length === 0 ? (
            <EmptyState title={t("dipEmpty")} description={t("dipScan")} />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <th className="py-2.5 pr-3 text-left font-medium">QR</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipNumber")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipStudent")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipProgram")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipDegree")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipGpa")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipIssued")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("dipVerify")}</th>
                </tr>
              </thead>
              <tbody>
                {diplomas.map((diploma) => (
                  <tr
                    key={diploma.id}
                    className="border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="py-3 pr-3">
                      <DiplomaQr url={origin ? verifyUrl(diploma.verifyCode) : ""} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs font-semibold text-brand-900">
                        {diploma.number}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{diploma.student.name}</p>
                      {diploma.student.group ? (
                        <p className="text-xs text-slate-500">{diploma.student.group}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{diploma.program}</td>
                    <td className="px-3 py-3">
                      <Badge tone={diploma.degree === "Magistr" ? "purple" : "blue"}>
                        {diploma.degree}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-700">
                      {diploma.gpa === null ? "—" : diploma.gpa.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {fmtDate(diploma.issuedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={verifyUrl(diploma.verifyCode)}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-40 truncate text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
                        >
                          {verifyUrl(diploma.verifyCode)}
                        </a>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void copyLink(diploma)}
                        >
                          {copiedId === diploma.id ? "Nusxalandi ✓" : "Nusxalash"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
