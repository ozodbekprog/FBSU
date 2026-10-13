"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  Stat,
  Table,
} from "@/components/ui";
import { cn, fmtDateTime } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { remainingAfterPayment, studentTotals } from "./debt";

export type FinanceStudentOption = {
  id: string;
  name: string;
  groupName: string | null;
  facultyId: string | null;
  facultyName: string | null;
};

export type FinanceContractItem = {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string | null;
  year: number;
  amount: number;
  paid: number;
  debt: number;
  note: string | null;
  createdAt: string;
};

export type FinancePaymentItem = {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string | null;
  amount: number;
  method: string;
  note: string | null;
  paidAt: string;
  createdAt: string;
};

export type FinanceStats = {
  contractCount: number;
  contractTotal: number;
  paidTotal: number;
  debtTotal: number;
  overpaidTotal: number;
  debtorCount: number;
};

const YEARS = [2024, 2025, 2026, 2027];

const METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "CASH", label: "Naqd" },
  { value: "CARD", label: "Plastik" },
  { value: "BANK", label: "Bank" },
];

const METHOD_TONES: Record<string, "green" | "blue" | "purple"> = {
  CASH: "green",
  CARD: "blue",
  BANK: "purple",
};

function money(value: number) {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return rounded < 0 ? `-${grouped}` : grouped;
}

function methodLabel(method: string) {
  const option = METHOD_OPTIONS.find((item) => item.value === method);
  return option ? option.label : method;
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };

export default function FinanceBoard({
  contracts,
  students,
  payments,
  canManage,
  stats,
  facultyRates = {},
}: {
  contracts: FinanceContractItem[];
  students: FinanceStudentOption[];
  payments: FinancePaymentItem[];
  canManage: boolean;
  stats: FinanceStats;
  /** facultyId -> belgilangan shartnoma summa (avtomatik to'ldirish uchun). */
  facultyRates?: Record<string, number>;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [year, setYear] = useState(() => {
    const current = new Date().getFullYear();
    return YEARS.includes(current) ? String(current) : String(YEARS[YEARS.length - 1]);
  });
  const [studentId, setStudentId] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentStudent, setPaymentStudent] = useState<{ id: string; name: string } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [paySaved, setPaySaved] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const contractedIds = new Set(
    contracts
      .filter((contract) => contract.year === Number(year))
      .map((contract) => contract.studentId),
  );

  const availableStudents = students.filter((student) => !contractedIds.has(student.id));

  // Formada tanlanadigan fakultetlar (shartnomasi yo'q talabalari bor).
  const facultyOptions = (() => {
    const ids = new Set(
      students
        .filter((student) => student.facultyId && !contractedIds.has(student.id))
        .map((student) => student.facultyId as string),
    );
    return [...ids]
      .map((id) => ({
        id,
        name: students.find((student) => student.facultyId === id)?.facultyName ?? id,
        count: students.filter(
          (student) => student.facultyId === id && !contractedIds.has(student.id),
        ).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const visibleStudents = facultyFilter
    ? availableStudents.filter((student) => student.facultyId === facultyFilter)
    : availableStudents;

  // Tanlangan talabaning fakultetiga admin belgilagan summa.
  // Foydalanuvchi maydonu o'zgartirgan bo'lsa — ustiga yozmaymiz.
  const suggestedAmount = (() => {
    if (amountTouched) return null;
    const student = students.find((item) => item.id === studentId);
    if (!student?.facultyId) return null;
    const rate = facultyRates[student.facultyId];
    return rate && rate > 0 ? rate : null;
  })();

  // Tanlangan talabaning jami shartnoma / to'lov / qarz ko'rsatkichlari
  const paymentTotals = paymentStudent
    ? studentTotals(contracts, paymentStudent.id)
    : null;

  // Kiritilayotgan summa hisobga olingandan keyingi qarz (jonli)
  const debtAfterPayment = paymentTotals
    ? remainingAfterPayment(paymentTotals.debt, Number(payAmount))
    : null;

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountValue = Number(amount);
    if (busy || !studentId || !Number.isInteger(amountValue) || amountValue < 0) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch("/api/finance/contracts", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          year: Number(year),
          amount: amountValue,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<FinanceContractItem> | null;
      if (!res.ok || !json || !json.ok) {
        setError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      setStudentId("");
      setAmount("");
      setSaved(true);
      router.refresh();
    } catch {
      setError(null);
    } finally {
      setBusy(false);
    }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountValue = Number(payAmount);
    if (payBusy || !paymentStudent || !Number.isInteger(amountValue) || amountValue <= 0) return;
    setPayBusy(true);
    setPayError(null);
    setPaySaved(false);
    try {
      const res = await apiFetch("/api/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          studentId: paymentStudent.id,
          amount: amountValue,
          method: payMethod,
          note: payNote.trim() ? payNote.trim() : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult<FinancePaymentItem> | null;
      if (!res.ok || !json || !json.ok) {
        setPayError(json && !json.ok ? json.error ?? null : null);
        return;
      }
      setPayAmount("");
      setPayNote("");
      setPaySaved(true);
      router.refresh();
    } catch {
      setPayError(null);
    } finally {
      setPayBusy(false);
    }
  }

  function selectForPayment(contract: FinanceContractItem) {
    setPaymentStudent({ id: contract.studentId, name: contract.studentName });
    setPayAmount("");
    setPayNote("");
    setPaySaved(false);
    setPayError(null);
    if (typeof document !== "undefined") {
      document.getElementById("finance-payment-form")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("finContract")}
          value={money(stats.contractCount)}
          hint={money(stats.contractTotal)}
        />
        <Stat label={t("finPaid")} value={money(stats.paidTotal)} />
        <Stat
          label={t("finCurrentDebt")}
          value={money(stats.debtTotal)}
          hint={`${stats.debtorCount} / ${stats.contractCount}`}
        />
        <Stat label={t("finOverpaid")} value={money(stats.overpaidTotal)} />
      </div>

      {canManage ? (
        <Card>
          <CardHeader title={t("finAddContract")} />
          <CardBody>
            <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={createContract}>
              <div>
                <Label>{t("finYear")}</Label>
                <Select value={year} onChange={(e) => setYear(e.target.value)} required>
                  {YEARS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("finFaculty")}</Label>
                <Select
                  value={facultyFilter}
                  onChange={(e) => {
                    setFacultyFilter(e.target.value);
                    setStudentId("");
                    setAmount("");
                    setAmountTouched(false);
                  }}
                >
                  <option value="">{t("finFacultyAll")}</option>
                  {facultyOptions.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name} ({faculty.count})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("grdStudent")}</Label>
                <Select
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setAmount("");
                    setAmountTouched(false);
                  }}
                  required
                >
                  <option value="">—</option>
                  {visibleStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.groupName ? ` — ${student.groupName}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("finAmount")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={amountTouched || !suggestedAmount ? amount : String(suggestedAmount)}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountTouched(true);
                  }}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={busy || !studentId || !amount || !Number.isInteger(Number(amount))}
                >
                  {t("crsSave")}
                </Button>
              </div>
            </form>
            {saved ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                {t("finSaved")}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {canManage && paymentStudent ? (
        <Card>
          <CardHeader title={t("finAddPayment")} subtitle={paymentStudent.name} />
          <CardBody>
            {paymentTotals ? (
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <Stat
                  label={t("finAmount")}
                  value={money(paymentTotals.amount)}
                  hint={String(paymentTotals.count)}
                />
                <Stat label={t("finPaid")} value={money(paymentTotals.paid)} />
                <Stat
                  label={t("finCurrentDebt")}
                  value={money(paymentTotals.debt)}
                  hint={
                    paymentTotals.debt > 0
                      ? undefined
                      : paymentTotals.debt < 0
                        ? t("finOverpaid")
                        : undefined
                  }
                />
              </div>
            ) : null}
            <form
              id="finance-payment-form"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              onSubmit={createPayment}
            >
              <div>
                <Label>{t("finAmount")}</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t("finMethod")}</Label>
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t("crsNote")}</Label>
                <Input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  maxLength={500}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={payBusy || !payAmount || !Number.isInteger(Number(payAmount))}
                >
                  {t("crsSave")}
                </Button>
              </div>
            </form>
            {debtAfterPayment !== null ? (
              <p
                className={cn(
                  "mt-3 rounded-xl px-3.5 py-2.5 text-sm",
                  debtAfterPayment > 0
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700",
                )}
              >
                {t("finAfterPayment")}:{" "}
                <span className="font-semibold">
                  {debtAfterPayment > 0 ? money(debtAfterPayment) : t("finOverpaid")}
                  {debtAfterPayment <= 0 ? ` (${money(Math.abs(debtAfterPayment))})` : ""}
                </span>
              </p>
            ) : null}
            {paySaved ? (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                {t("finSaved")}
              </p>
            ) : null}
            {payError ? (
              <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {payError}
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={t("finContract")} subtitle={contracts.length} />
        <CardBody>
          {contracts.length === 0 ? (
            <EmptyState title={t("finEmpty")} />
          ) : (
            <div className="-mx-6 overflow-x-auto">
              <Table>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-2 font-medium">{t("grdStudent")}</th>
                    <th className="px-3 py-2 font-medium">{t("grdGroup")}</th>
                    <th className="px-3 py-2 font-medium">{t("finYear")}</th>
                    <th className="px-3 py-2 font-medium">{t("finAmount")}</th>
                    <th className="px-3 py-2 font-medium">{t("finPaid")}</th>
                    <th className="px-3 py-2 font-medium">{t("finDebt")}</th>
                    {canManage ? <th className="px-6 py-2 font-medium" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="text-sm text-slate-700">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {contract.studentName}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{contract.groupName ?? "—"}</td>
                      <td className="px-3 py-3 text-slate-600">{contract.year}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {money(contract.amount)}
                      </td>
                      <td className="px-3 py-3 text-emerald-600">{money(contract.paid)}</td>
                      <td
                        className={cn(
                          "px-3 py-3 font-medium",
                          contract.debt > 0 ? "text-rose-600" : "text-slate-500",
                        )}
                      >
                        {money(contract.debt)}
                      </td>
                      {canManage ? (
                        <td className="px-6 py-3 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => selectForPayment(contract)}
                          >
                            {t("finAddPayment")}
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("finPayments")} subtitle={payments.length} />
        <CardBody>
          {payments.length === 0 ? (
            <EmptyState title={t("finEmpty")} />
          ) : (
            <div className="-mx-6 overflow-x-auto">
              <Table>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-2 font-medium">{t("grdStudent")}</th>
                    <th className="px-3 py-2 font-medium">{t("grdGroup")}</th>
                    <th className="px-3 py-2 font-medium">{t("finAmount")}</th>
                    <th className="px-3 py-2 font-medium">{t("finMethod")}</th>
                    <th className="px-6 py-2 font-medium">{t("grdDate")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="text-sm text-slate-700">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {payment.studentName}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{payment.groupName ?? "—"}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {money(payment.amount)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={METHOD_TONES[payment.method] ?? "slate"}>
                          {methodLabel(payment.method)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">
                        {fmtDateTime(payment.paidAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
