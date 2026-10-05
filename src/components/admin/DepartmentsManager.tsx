"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, EmptyState, Input, Label, Select, Table } from "@/components/ui";
import { ensureCsrfToken } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

export type DepartmentRow = {
  id: string;
  name: string;
  code: string | null;
  facultyId: string | null;
  facultyName: string | null;
  usersCount: number;
  subjectsCount: number;
};

export type FacultyOption = { id: string; name: string };

async function request(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const token = await ensureCsrfToken();
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "x-csrf-token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
}

export function DepartmentsManager({
  departments,
  faculties,
}: {
  departments: DepartmentRow[];
  faculties: FacultyOption[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditId(null);
    setName("");
    setCode("");
    setFacultyId("");
    setError(null);
  }

  function startEdit(row: DepartmentRow) {
    setEditId(row.id);
    setName(row.name);
    setCode(row.code ?? "");
    setFacultyId(row.facultyId ?? "");
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { name, code: code || null, facultyId: facultyId || null };
    const json = editId
      ? await request(`/api/admin/departments/${editId}`, "PATCH", payload)
      : await request("/api/admin/departments", "POST", payload);
    setBusy(false);
    if (!json?.ok) {
      setError(json?.error ?? t("admErrorGeneric"));
      return;
    }
    reset();
    router.refresh();
  }

  async function remove(row: DepartmentRow) {
    if (!window.confirm(t("admDeptDeleteConfirm", { name: row.name }))) return;
    setBusy(true);
    setError(null);
    const json = await request(`/api/admin/departments/${row.id}`, "DELETE");
    setBusy(false);
    if (!json?.ok) {
      setError(json?.error ?? t("admDeleteFailed"));
      return;
    }
    if (editId === row.id) reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title={editId ? t("admDeptEditTitle") : t("admDeptNewTitle")}
          subtitle={t("admDeptFormSubtitle")}
        />
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>{t("admNameRequired")}</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("admDeptNamePlaceholder")}
                required
              />
            </div>
            <div>
              <Label>{t("admCodeAlt")}</Label>
              <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="DK" />
            </div>
            <div>
              <Label>{t("admFaculty")}</Label>
              <Select value={facultyId} onChange={(event) => setFacultyId(event.target.value)}>
                <option value="">{t("admNoFaculty")}</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </Select>
            </div>
            {error ? (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              {editId ? (
                <Button type="button" variant="secondary" onClick={reset}>{t("admCancel")}</Button>
              ) : null}
              <Button type="submit" disabled={busy}>
                {busy ? t("admSaving") : editId ? t("admSave") : t("admAdd")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("admDepartments")} subtitle={t("admDeptListSubtitle", { count: departments.length })} />
        <CardBody>
          {departments.length === 0 ? (
            <EmptyState
              title={t("admDeptEmptyTitle")}
              description={t("admDeptEmptyDesc")}
            />
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="rounded-l-xl py-2.5 pr-3 pl-3 text-left font-medium">{t("admName")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("admFaculty")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("admColMembers")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("admSubjects")}</th>
                  <th className="rounded-r-xl px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-3 pl-3">
                      <p className="text-sm font-medium text-slate-800">{row.name}</p>
                      {row.code ? <p className="text-xs text-slate-500">{row.code}</p> : null}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">
                      {row.facultyName ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">{row.usersCount}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">{row.subjectsCount}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(row)}>{t("admEdit")}</Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => void remove(row)}
                        >{t("admDelete")}</Button>
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
