"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DocumentKind, DocumentStatus } from "@prisma/client";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/i18n/uz";

export type StaffOption = {
  id: string;
  name: string;
};

export type StudentOption = {
  id: string;
  name: string;
  group: string | null;
};

export type DocumentItem = {
  id: string;
  kind: DocumentKind;
  number: string | null;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  createdById: string;
  createdBy: { id: string; name: string };
  signerId: string | null;
  signer: { id: string; name: string } | null;
  signedBy: { id: string; name: string } | null;
  signedAt: string | null;
  archivedAt: string | null;
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };
type DocumentAction = "submit" | "sign" | "reject" | "archive" | "reopen";

const KIND_LABELS: Record<DocumentKind, keyof Dictionary> = {
  ORDER: "docKindOrder",
  LETTER: "docKindLetter",
  REFERENCE: "docKindReference",
  PROTOCOL: "docKindProtocol",
  OTHER: "docKindOther",
};

const STATUS_LABELS: Record<DocumentStatus, keyof Dictionary> = {
  DRAFT: "docStatusDraft",
  PENDING: "docStatusPending",
  SIGNED: "docStatusSigned",
  REJECTED: "docStatusRejected",
  ARCHIVED: "docStatusArchived",
};

const STATUS_TONES: Record<DocumentStatus, "slate" | "amber" | "green" | "rose" | "blue"> = {
  DRAFT: "slate",
  PENDING: "amber",
  SIGNED: "green",
  REJECTED: "rose",
  ARCHIVED: "blue",
};

const STATUS_ORDER: DocumentStatus[] = ["DRAFT", "PENDING", "SIGNED", "REJECTED", "ARCHIVED"];

type OrderTemplate = {
  id: string;
  label: string;
  title: string;
  body: string;
  needsStudent: boolean;
};

const ORDER_TEMPLATES: OrderTemplate[] = [
  {
    id: "enroll",
    label: "Talabani qabul qilish",
    title: "O'qishga qabul qilish to'g'risida",
    body: "TTPU qabul komissiyasi qarori va {{talaba}} ning arizasiga asosan, uni Turin Politexnika Universitetining bakalavriat bosqichiga talaba sifatida qabul qilishni buyuraman. Registrator bo'limiga shaxsiy ish hujjatlarini to'liq rasmiylashtirishni topshiraman.",
    needsStudent: true,
  },
  {
    id: "transfer",
    label: "Ko'chirish (yo'nalish/guruh)",
    title: "O'qishni ko'chirish to'g'risida",
    body: "{{talaba}} ning arizasiga asosan, uni boshqa ta'lim yo'nalishiga (guruhga) o'qishini ko'chirishga ruxsat berilsin. Registrator bo'limiga o'quv rejasidagi farq fanlarini qayta hisoblash, tyutoriga moslashuv davrida yordam ko'rsatish topshirilsin.",
    needsStudent: true,
  },
  {
    id: "reinstate",
    label: "Qayta tiklash",
    title: "Talabalar safiga qayta tiklash to'g'risida",
    body: "{{talaba}} ni akademik qarzdorliklarni tugatganligi munosabati bilan Turin Politexnika Universiteti talabalari safiga qayta tiklashni buyuraman. Moliya bo'limiga o'quv shartnomasini yangilash, dekanga o'quv jarayoniga qo'shish topshirilsin.",
    needsStudent: true,
  },
  {
    id: "scholarship",
    label: "Stipendiya tayinlash",
    title: "Stipendiya tayinlash to'g'risida",
    body: "{{talaba}} ning o'quv yilidagi yuqori natijalari inobatga olinib, unga davlat stipendiyasi tayinlansin. Moliya bo'limiga stipendiyani belgilangan tartibda oylik to'lashni yo'lga qo'yish topshirilsin.",
    needsStudent: true,
  },
  {
    id: "expel",
    label: "O'qishdan chetlatish",
    title: "O'qishdan chetlatish to'g'risida",
    body: "{{talaba}} o'quv mashg'ulotlariga uzrsiz sabablarga ko'ra qatnashmaganligi va ichki tartib qoidalarini buzganligi munosabati bilan universitet talabalari safidan chetlatilsin. Registrator bo'limiga buyruq nusxasini talabaning shaxsiy ishiga ilova qilishni topshiraman.",
    needsStudent: true,
  },
  {
    id: "vacation",
    label: "Ta'til berish",
    title: "Ta'til berish to'g'risida",
    body: "{{talaba}} ga o'qish ta'tili berilsin. Moliya bo'limiga ta'til davridagi to'lov shartlarini qayta hisoblash, guruh tyutoriga talaba bilan aloqani saqlash topshirilsin.",
    needsStudent: true,
  },
  {
    id: "reward",
    label: "Rag'batlantirish",
    title: "Rag'batlantirish to'g'risida",
    body: "{{talaba}} ning o'quv yilida erishgan yutuqlari va xalqaro tanlovlardagi faol ishtiroki uchun unga minnatdorchilik e'lon qilinsin hamda qo'shimcha rag'batlantirish choralari qo'llanilsin.",
    needsStudent: true,
  },
  {
    id: "penalty",
    label: "Intizomiy jazo",
    title: "Intizomiy jazo qo'llash to'g'risida",
    body: "{{talaba}} tomonidan ichki tartib qoidalari va akademik halollik talablari buzilganligi munosabati bilan unga intizomiy jazo choralari qo'llanilsin. Yoshlar ishlari bo'limiga tushuntirish ishlarini olib borish topshirilsin.",
    needsStudent: true,
  },
  {
    id: "dismiss",
    label: "Ishdan bo'shatish",
    title: "Ishdan bo'shatish to'g'risida",
    body: "TTPU xodimining mehnat shartnomasini bekor qilish to'g'risidagi arizasi va mehnat qonunchiligi talablari asosida uni egallab turgan lavozimidan ozod etilsin. Buxgalteriya bo'limiga to'liq hisob-kitob qilishni topshiraman.",
    needsStudent: false,
  },
];

export default function DocumentBoard({
  documents,
  staff,
  students,
  currentUserId,
  canCreate,
  isManager,
  isAdmin,
}: {
  documents: DocumentItem[];
  staff: StaffOption[];
  students: StudentOption[];
  currentUserId: string;
  canCreate: boolean;
  isManager: boolean;
  isAdmin: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [kind, setKind] = useState<DocumentKind>("ORDER");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [signerId, setSignerId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [orderTemplateId, setOrderTemplateId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleDocuments = useMemo(
    () => documents.filter((document) => (statusFilter ? document.status === statusFilter : true)),
    [documents, statusFilter],
  );

  const canSave = signerId !== "" && title.trim().length >= 3 && body.trim().length >= 3;

  const activeOrderTemplate =
    kind === "ORDER" ? (ORDER_TEMPLATES.find((item) => item.id === orderTemplateId) ?? null) : null;

  function applyOrderTemplate() {
    if (!activeOrderTemplate) return;
    const student = students.find((item) => item.id === studentId);
    if (activeOrderTemplate.needsStudent && !student) return;
    const replacement = student
      ? `${student.name}${student.group ? ` (${student.group} guruhi)` : ""}`
      : "TTPU xodimi";
    setTitle(activeOrderTemplate.title);
    setBody(activeOrderTemplate.body.split("{{talaba}}").join(replacement));
    setNotice("Shablon matni avtomatik to'ldirildi");
  }

  function applyReferenceTemplate() {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    const group = student.group ? ` (${student.group} guruhi)` : "";
    setBody(
      `TTPU talabasi ${student.name}${group} haqiqatan ham Turin Politexnika Universitetida tahsil olmoqda. Ma'lumotnoma talaba so'rovi asosida o'qish joyidan talab qilingan holda berildi.`,
    );
    setNotice(t("docReferenceGenerated"));
  }

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canSave) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch("/api/documents", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title: title.trim(),
          body: body.trim(),
          signerId,
          meta:
            (kind === "REFERENCE" || activeOrderTemplate?.needsStudent) && studentId
              ? { studentId }
              : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<DocumentItem> | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      setKind("ORDER");
      setTitle("");
      setBody("");
      setSignerId("");
      setStudentId("");
      setOrderTemplateId("");
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  async function runAction(document: DocumentItem, action: DocumentAction) {
    if (busyId) return;
    setBusyId(document.id);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<DocumentItem> | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {canCreate ? (
        <Card>
          <CardHeader title={t("docNew")} subtitle={t("docSignHint")} />
          <CardBody>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={createDocument}>
              <div>
                <Label>{t("docKind")}</Label>
                <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
                  <option value="ORDER">{t("docKindOrder")}</option>
                  <option value="LETTER">{t("docKindLetter")}</option>
                  <option value="REFERENCE">{t("docKindReference")}</option>
                  <option value="PROTOCOL">{t("docKindProtocol")}</option>
                  <option value="OTHER">{t("docKindOther")}</option>
                </Select>
              </div>
              <div>
                <Label>{t("docSigner")}</Label>
                <Select value={signerId} onChange={(e) => setSignerId(e.target.value)} required>
                  <option value="">{t("docSignHint")}</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>{t("docFieldTitle")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>
              {kind === "REFERENCE" ? (
                <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
                  <div className="min-w-56 flex-1">
                    <Label>{t("docForStudent")}</Label>
                    <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                      <option value="">—</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                          {student.group ? ` — ${student.group}` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!studentId}
                    onClick={applyReferenceTemplate}
                  >
                    {t("docReferenceGenerated")}
                  </Button>
                </div>
              ) : null}
              {kind === "ORDER" ? (
                <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
                  <div className="min-w-56 flex-1">
                    <Label>Buyruq shabloni</Label>
                    <Select
                      value={orderTemplateId}
                      onChange={(e) => setOrderTemplateId(e.target.value)}
                    >
                      <option value="">—</option>
                      {ORDER_TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {activeOrderTemplate?.needsStudent ? (
                    <div className="min-w-56 flex-1">
                      <Label>{t("docForStudent")}</Label>
                      <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                        <option value="">—</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name}
                            {student.group ? ` — ${student.group}` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!activeOrderTemplate || (activeOrderTemplate.needsStudent && !studentId)}
                    onClick={applyOrderTemplate}
                  >
                    Shablonni qo&apos;llash
                  </Button>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label>{t("docFieldBody")}</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  required
                  minLength={3}
                  maxLength={8000}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy || !canSave}>
                  {t("tskSave")}
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

      {notice ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      ) : null}

      <Card>
        {/* Filtr `CardHeader` dan chiqarildi: header `flex justify-between` va
            sarlavha `min-w-0` bo'lgani uchun mobil'da sarlavha 23px gacha
            siqilib, so'zlari filtr ustiga chiqib ustma-ust tushardi.
            Endi filtr to'liq enli `CardBody` da — sarlavhaga xamashlashmaydi. */}
        <CardHeader title={t("docRegistry")} subtitle={documents.length} />
        <CardBody>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label
              htmlFor="doc-status-filter"
              className="shrink-0 text-xs font-medium text-slate-600"
            >
              {t("docFilterStatus")}
            </label>
            {/* `Select` ichida `w-full` bor va `cn` — oddiy `join(" ")`, ya'ni
                twMerge emas; shuning uchun `w-44` klassi ishlamaidi. Shu sabab
                kenglikni tashqi konteyner beramiz. */}
            <div className="w-full sm:w-44">
              <Select
                id="doc-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">—</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {t(STATUS_LABELS[status])}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {visibleDocuments.length === 0 ? (
            <EmptyState title={t("docEmpty")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleDocuments.map((document) => {
                const isCreator = document.createdById === currentUserId;
                const canDecide = document.signerId === currentUserId || isAdmin;
                const canSubmit =
                  (isCreator || isManager) &&
                  (document.status === "DRAFT" || document.status === "REJECTED") &&
                  document.signer !== null;
                const canReopen =
                  document.status === "REJECTED" && (isCreator || isManager);
                return (
                  <Card key={document.id} className="flex flex-col justify-between p-5">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="purple">{t(KIND_LABELS[document.kind])}</Badge>
                          <Badge tone={STATUS_TONES[document.status]}>
                            {t(STATUS_LABELS[document.status])}
                          </Badge>
                        </div>
                        <span className="font-mono text-xs tracking-wider text-slate-500">
                          {document.number ?? "—"}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold tracking-tight text-slate-900">
                        {document.title}
                      </h3>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Badge tone="slate">
                          {t("docCreatedBy")}: {document.createdBy.name}
                        </Badge>
                        {document.signer ? (
                          <Badge tone="blue">
                            {t("docSigner")}: {document.signer.name}
                          </Badge>
                        ) : (
                          <Badge tone="rose">{t("docNoSigner")}</Badge>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{fmtDateTime(document.createdAt)}</p>
                      {document.signedAt ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {t("docSignedAt")}: {fmtDateTime(document.signedAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <ButtonLink href={`/documents/${document.id}`} size="sm" variant="secondary">
                        {t("docView")}
                      </ButtonLink>
                      {canSubmit ? (
                        <Button
                          size="sm"
                          disabled={busyId === document.id}
                          onClick={() => runAction(document, "submit")}
                        >
                          {t("docSubmit")}
                        </Button>
                      ) : null}
                      {document.status === "PENDING" && canDecide ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === document.id}
                            onClick={() => runAction(document, "sign")}
                          >
                            {t("docSign")}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === document.id}
                            onClick={() => runAction(document, "reject")}
                          >
                            {t("docReject")}
                          </Button>
                        </>
                      ) : null}
                      {document.status === "SIGNED" && isManager ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === document.id}
                          onClick={() => runAction(document, "archive")}
                        >
                          {t("docArchive")}
                        </Button>
                      ) : null}
                      {canReopen ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === document.id}
                          onClick={() => runAction(document, "reopen")}
                        >
                          {t("tskReopen")}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function PrintButton() {
  const { t } = useI18n();
  return <Button onClick={() => window.print()}>{t("docPrint")}</Button>;
}
