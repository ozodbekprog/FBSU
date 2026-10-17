"use client";

import { useCallback, useMemo, useState } from "react";
import type { Role, SalaryStatus } from "@prisma/client";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Select } from "@/components/ui";

/* ------------------------------------------------------------------ tiplar */

type Totals = {
  byGroup: Array<{ group: string; count: number; total: number }>;
  unassigned: { count: number; total: number };
  grandTotal: number;
  totalCount: number;
};

type RecordItem = {
  id: string;
  month: string;
  baseAmount: number;
  bonusAmount: number;
  total: number;
  status: SalaryStatus;
  note: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    staffPosition: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
  };
};

type Grant = {
  role: Role;
  canView: boolean;
  revokedAt: string | null;
  createdAt: string;
  grantedBy: { name: string };
};

type Position = {
  id: string;
  name: string;
  code: string | null;
  baseSalary: number;
  isActive: boolean;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  _count: { users: number };
};

type Shift = {
  id: string;
  name: string;
  code: string | null;
  startMinutes: number;
  endMinutes: number;
  isNight: boolean;
  isActive: boolean;
  _count: { assignments: number };
};

type Employee = {
  id: string;
  name: string;
  role: Role;
  positionName: string | null;
  departmentName: string | null;
  shifts: Array<{ id: string; weekday: number; shift: { id: string; name: string } }>;
};

export type PayrollInitialData = {
  month: string;
  records: RecordItem[];
  totals: Totals;
  canManage: boolean;
  viewerRole: Role;
  /** Ruxsat berilishi mumkin bo'lgan rollar (serverdan, `SALARY_GRANTABLE_ROLES`). */
  grantableRoles: Role[];
  grants: Grant[];
  positions: Position[];
  departments: Array<{ id: string; name: string }>;
  shifts: Shift[];
  employees: Employee[];
  weekdays: readonly string[];
};

type Dict = {
  title: string; subtitle: string; viewOnly: string;
  tabRecords: string; tabPositions: string; tabShifts: string;
  tabSchedule: string; tabGrants: string;
  month: string; employee: string; position: string; department: string;
  base: string; bonus: string; total: string; status: string;
  addRecord: string; editRecord: string; empty: string;
  draft: string; pending: string; approved: string; paid: string;
  approve: string; markPaid: string; sendPending: string;
  note: string; notePh: string;
  summaryTitle: string; summarySubtitle: string; grandTotal: string;
  unassigned: string; staffCount: string; noGroupData: string;
  positionsTitle: string; positionsSubtitle: string; addPosition: string;
  baseSalary: string; positionName: string; positionPh: string;
  code: string; codePh: string; assigned: string; noPositions: string;
  shiftsTitle: string; shiftsSubtitle: string; addShift: string;
  shiftName: string; shiftNamePh: string; shiftStart: string; shiftEnd: string;
  shiftNight: string; shiftDuration: string; noShifts: string; shiftUsed: string;
  scheduleTitle: string; scheduleSubtitle: string; assignShift: string;
  weekday: string; shift: string; pickEmployee: string; pickShift: string;
  noAssignments: string; clearShift: string;
  grantsTitle: string; grantsSubtitle: string; grantRole: string;
  grantActive: string; grantRevoked: string; grantBtn: string; revokeBtn: string;
  noGrants: string; alwaysSee: string; grantedBy: string;
  saveError: string; amountError: string; payCancel: string; editShort: string; payDelete: string; deleteHint: string;
  roleBuxgalter: string; roleXodim: string; roleTyutor: string;
  roleHead: string; roleDean: string; roleProRector: string; roleRector: string;
  roleAdmin: string; roleRegistrar: string; roleTeacher: string;
  roleStudent: string; roleParent: string; roleOwner?: string;
};

type Tab = "records" | "grants";

/* ---------------------------------------------------------------- yordamchi */

// Buxgalter uchun faqat ikkita bo'lim: oyliklarning o'zi va kimga
// ko'rish ruxsati. Lavozim / navbar / haftalik grafik modullari API
// va bazada saqlanib qoladi (boshqa hisobotlarda foydali bo'lishi
// mumkin), lekin bu sahifada ko'rsatilmaydi.
const TABS: Tab[] = ["records", "grants"];

const STATUS_TONE: Record<SalaryStatus, "slate" | "amber" | "green" | "blue"> = {
  DRAFT: "slate",
  PENDING: "amber",
  APPROVED: "green",
  PAID: "blue",
};

function fmt(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Navbar davomiyligi — kechasi yarim kechadan o'tsa (+1 kun). */
function duration(a: number, b: number): string {
  const end = b <= a ? b + 24 * 60 : b;
  const mins = end - a;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
}

export default function PayrollBoard({
  initial,
  dictionary: d,
}: {
  initial: PayrollInitialData;
  dictionary: Dict;
}) {
  const [tab, setTab] = useState<Tab>("records");
  const [records, setRecords] = useState(initial.records);
  const [employees, setEmployees] = useState(initial.employees);
  const [grants, setGrants] = useState(initial.grants);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roleLabels: Record<Role, string> = useMemo(
    () => ({
      BUXGALTER: d.roleBuxgalter,
      XODIM: d.roleXodim,
      TYUTOR: d.roleTyutor,
      KAFEDRA_MUDIRI: d.roleHead,
      DEKAN: d.roleDean,
      PRO_RECTOR: d.roleProRector,
      REKTOR: d.roleRector,
      ADMIN: d.roleAdmin,
      REGISTRAR: d.roleRegistrar,
      TEACHER: d.roleTeacher,
      STUDENT: d.roleStudent,
      OTA_ONA: d.roleParent,
      OWNER: d.roleOwner ?? d.roleAdmin,
    }),
    [d],
  );

  const statusLabel: Record<SalaryStatus, string> = {
    DRAFT: d.draft,
    PENDING: d.pending,
    APPROVED: d.approved,
    PAID: d.paid,
  };

  /* --------------------------------------------------------------- so'rovlar */

  const call = useCallback(
    async (url: string, init?: RequestInit) => {
      const csrfRes = await fetch("/api/csrf", { credentials: "same-origin" });
      const { token } = (await csrfRes.json()) as { token: string };
      const res = await fetch(url, {
        ...init,
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": token,
          ...(init?.headers ?? {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      return body as Record<string, unknown>;
    },
    [],
  );

  /* --------------------------------------------------------------- oyliklar */

  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [adding, setAdding] = useState(false);

  const saveRecord = useCallback(
    async (payload: {
      userId: string;
      baseAmount: number;
      bonusAmount: number;
      note?: string;
    }) => {
      setBusy(true);
      setError(null);
      try {
        if (editing) {
          const { record } = (await call(`/api/salary-records?id=${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })) as { record: RecordItem };
          setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
        } else {
          const { record } = (await call("/api/salary-records", {
            method: "POST",
            body: JSON.stringify({ ...payload, month: initial.month }),
          })) as { record: RecordItem };
          setRecords((prev) => [record, ...prev]);
        }
        setEditing(null);
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : d.saveError);
      } finally {
        setBusy(false);
      }
    },
    [call, editing, initial.month, d.saveError],
  );

  const changeStatus = useCallback(
    async (id: string, status: SalaryStatus) => {
      setBusy(true);
      setError(null);
      try {
        const { record } = (await call(`/api/salary-records/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        })) as { record: { id: string; status: SalaryStatus } };
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: record.status } : r)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : d.saveError);
      } finally {
        setBusy(false);
      }
    },
    [call, d.saveError],
  );

  /* ------------------------------------------------------------ bekor qilish */

  // To'lov amalga oshgandan keyin o'chirilmaydi (`PAID`), shuning uchun
  // faqat ruxsat berilgan holatlarda tugma ko'rinadi.
  const [confirmDelete, setConfirmDelete] = useState<RecordItem | null>(null);

  const removeRecord = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await call(`/api/salary-records/${id}`, { method: "DELETE" });
        setRecords((prev) => prev.filter((r) => r.id !== id));
        setConfirmDelete(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : d.saveError);
      } finally {
        setBusy(false);
      }
    },
    [call, d.saveError],
  );

  /* ---------------------------------------------------------------- ruxsatlar */

  const [grantRole, setGrantRole] = useState<Role | "">("");

  const addGrant = useCallback(async () => {
    if (!grantRole) return;
    setBusy(true);
    setError(null);
    try {
      const { grant } = (await call("/api/salary-grants", {
        method: "POST",
        body: JSON.stringify({ role: grantRole }),
      })) as { grant: Grant };
      setGrants((prev) => [
        ...prev.filter((g) => g.role !== grant.role),
        { ...grant, grantedBy: { name: "—" } },
      ]);
      setGrantRole("");
    } catch (e) {
      setError(e instanceof Error ? e.message : d.saveError);
    } finally {
      setBusy(false);
    }
  }, [call, grantRole, d.saveError]);

  const revokeGrant = useCallback(
    async (role: Role) => {
      setBusy(true);
      setError(null);
      try {
        await call(`/api/salary-grants?role=${role}`, { method: "DELETE" });
        setGrants((prev) =>
          prev.map((g) => (g.role === role ? { ...g, revokedAt: new Date().toISOString() } : g)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : d.saveError);
      } finally {
        setBusy(false);
      }
    },
    [call, d.saveError],
  );

  /* ------------------------------------------------------------------ render */

  const activeGrants = grants.filter((g) => !g.revokedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{d.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{d.subtitle}</p>
        {!initial.canManage && (
          <p className="mt-2 inline-flex rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            {d.viewOnly}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {initial.canManage && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const labels: Record<Tab, string> = {
              records: d.tabRecords,
              grants: d.tabGrants,
            };
            return (
              <Button
                key={t}
                variant={tab === t ? "primary" : "secondary"}
                size="sm"
                onClick={() => setTab(t)}
              >
                {labels[t]}
              </Button>
            );
          })}
        </div>
      )}

      {/* ======================================================== OYLIKLAR */}
      {(tab === "records" || !initial.canManage) && (
        <div className="space-y-4">
          <Card>
            <CardHeader title={d.summaryTitle} subtitle={d.summarySubtitle} />
            <CardBody>
              {initial.totals.byGroup.length === 0 &&
              initial.totals.unassigned.count === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">{d.noGroupData}</p>
              ) : (
                <div className="space-y-2">
                  {initial.totals.byGroup.map((g) => (
                    <div
                      key={g.group}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{g.group}</p>
                        <p className="text-xs text-slate-500">
                          {d.staffCount}: {g.count}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                        {fmt(g.total)}
                      </p>
                    </div>
                  ))}
                  {initial.totals.unassigned.count > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {d.unassigned}
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.staffCount}: {initial.totals.unassigned.count}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                        {fmt(initial.totals.unassigned.total)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-900 px-3 py-2.5 text-white">
                    <p className="text-sm font-medium">{d.grandTotal}</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {fmt(initial.totals.grandTotal)}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={d.tabRecords}
              subtitle={d.month + ": " + initial.month}
              action={
                initial.canManage ? (
                  <Button size="sm" onClick={() => { setAdding(true); setEditing(null); }}>
                    {d.addRecord}
                  </Button>
                ) : null
              }
            />
            <CardBody>
              {(adding || editing) && initial.canManage ? (
                <RecordForm
                  d={d}
                  employees={employees}
                  editing={editing}
                  busy={busy}
                  onCancel={() => { setAdding(false); setEditing(null); }}
                  onSave={saveRecord}
                />
              ) : records.length === 0 ? (
                <EmptyState title={d.empty} />
              ) : (
                <div className="space-y-2">
                  {records.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      {/* Sarlavha qatori: matn kesilib turadi (`truncate`),
                          aks holda uzun lavozim+bo'lim nomi ikki qatorga
                          o'tib, qator balandligini o'zgartirardi. */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {r.user.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {[r.user.staffPosition?.name, r.user.department?.name]
                              .filter(Boolean)
                              .join(" · ") || roleLabels[r.user.role]}
                          </p>
                        </div>
                        <Badge tone={STATUS_TONE[r.status]}>
                          {statusLabel[r.status]}
                        </Badge>
                      </div>
                      <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-0.5 text-xs">
                        <span className="truncate text-slate-500">
                          {d.base}: <b className="tabular-nums text-slate-800">{fmt(r.baseAmount)}</b>
                        </span>
                        <span className="truncate text-slate-500">
                          {d.bonus}: <b className="tabular-nums text-slate-800">{fmt(r.bonusAmount)}</b>
                        </span>
                        <span className="truncate text-slate-500">
                          {d.total}: <b className="tabular-nums text-slate-900">{fmt(r.total)}</b>
                        </span>
                      </div>
                      {initial.canManage && (
                        /* `flex-nowrap` + qisqa yorliqlar: ilgari ikkita uzun
                           tugma 390px ga sig'mab, qator balandligi 30px dan
                           64px ga sakrab turardi. */
                        <div className="mt-1.5 flex flex-nowrap items-center gap-1.5">
                          {r.status === "PENDING" && (
                            <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" disabled={busy}
                              onClick={() => changeStatus(r.id, "APPROVED")}>
                              {d.approve}
                            </Button>
                          )}
                          {r.status === "APPROVED" && (
                            <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" disabled={busy}
                              onClick={() => changeStatus(r.id, "PAID")}>
                              {d.markPaid}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" disabled={busy}
                            onClick={() => { setEditing(r); setAdding(false); }}>
                            {d.editShort}
                          </Button>
                          {/* To'lov amalga oshgachan o'chirish mumkin. */}
                          {r.status !== "PAID" && (
                            <Button size="sm" variant="ghost"
                              className="shrink-0 whitespace-nowrap text-rose-600 hover:bg-rose-50"
                              disabled={busy}
                              onClick={() => setConfirmDelete(r)}>
                              {d.payDelete}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ========================================================== RUXSATLAR */}
      {tab === "grants" && initial.canManage && (
        <div className="space-y-4">
          <Card>
            <CardHeader title={d.grantsTitle} subtitle={d.grantsSubtitle} />
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={grantRole} onChange={(e) => setGrantRole(e.target.value as Role)}>
                  <option value="">{d.grantRole}</option>
                  {/* Ro'yxat serverdan keladi — `SALARY_GRANTABLE_ROLES`.
                      Shu sababli UI va API bir manbani ishlatadi. */}
                  {initial.grantableRoles.map((r) => (
                    <option key={r} value={r}>{roleLabels[r] ?? r}</option>
                  ))}
                </Select>
                <Button disabled={busy || !grantRole} onClick={addGrant}>
                  {d.grantBtn}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              {grants.length === 0 ? (
                <EmptyState title={d.noGrants} />
              ) : (
                <div className="space-y-2">
                  {grants.map((g) => (
                    <div key={g.role}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{roleLabels[g.role]}</p>
                        <p className="text-xs text-slate-500">
                          {d.grantedBy}: {g.grantedBy.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={g.revokedAt ? "slate" : "green"}>
                          {g.revokedAt ? d.grantRevoked : d.grantActive}
                        </Badge>
                        {!g.revokedAt && (
                          <Button size="sm" variant="ghost" disabled={busy}
                            onClick={() => revokeGrant(g.role)}>
                            {d.revokeBtn}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeGrants.length === 0 && (
                    <p className="pt-2 text-xs text-slate-500">
                      {d.alwaysSee}: {d.roleBuxgalter}, {d.roleAdmin}
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Bekor qilish tasdig'i — moliyaviy ma'lumot, shuning uchun
          bir marta bosilishi yetarli emas. */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">{d.payDelete}?</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              <b>{confirmDelete.user.name}</b> —{" "}
              <span className="tabular-nums">{fmt(confirmDelete.total)}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">{d.deleteHint}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" disabled={busy}
                onClick={() => setConfirmDelete(null)}>
                {d.payCancel}
              </Button>
              <Button variant="danger" size="sm" disabled={busy}
                onClick={() => removeRecord(confirmDelete.id)}>
                {d.payDelete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- oylik kiritish formasi */

function RecordForm({
  d,
  employees,
  editing,
  busy,
  onCancel,
  onSave,
}: {
  d: Dict;
  employees: Employee[];
  editing: RecordItem | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: {
    userId: string;
    baseAmount: number;
    bonusAmount: number;
    note?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    userId: editing?.user.id ?? "",
    base: editing ? String(editing.baseAmount) : "",
    bonus: editing ? String(editing.bonusAmount) : "0",
    note: editing?.note ?? "",
  });

  const num = (v: string) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  };

  return (
    <div className="space-y-2">
      {!editing && (
        <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
          <option value="">{d.employee}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.positionName ? ` — ${e.positionName}` : ""}
            </option>
          ))}
        </Select>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="number" inputMode="numeric" placeholder={d.base} value={form.base}
          onChange={(e) => setForm({ ...form, base: e.target.value })} />
        <Input type="number" inputMode="numeric" placeholder={d.bonus} value={form.bonus}
          onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
      </div>
      <Input placeholder={d.notePh} value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <div className="flex gap-2">
        <Button disabled={busy || (!editing && !form.userId)}
          onClick={() =>
            onSave({
              userId: form.userId,
              baseAmount: num(form.base),
              bonusAmount: num(form.bonus),
              note: form.note || undefined,
            })
          }>
          {editing ? d.editRecord : d.addRecord}
        </Button>
        <Button variant="ghost" onClick={onCancel}>{d.payCancel}</Button>
      </div>
    </div>
  );
}