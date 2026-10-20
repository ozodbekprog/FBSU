"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, Label, Select, Table, Textarea } from "@/components/ui";

export type CohortItem = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
};

export type CohortGroupOption = { id: string; name: string };
export type CohortCourseOption = { id: string; title: string };

type CohortMember = { id: string; userId: string; name: string; email: string };
type UserOption = { id: string; name: string; email: string };
type ApiResult<T> = { ok: boolean; error?: string; data?: T };

export default function CohortsManager({
  cohorts,
  groups,
  courses,
}: {
  cohorts: CohortItem[];
  groups: CohortGroupOption[];
  courses: CohortCourseOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<CohortMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = cohorts.find((cohort) => cohort.id === selectedId) ?? null;

  const request = useCallback(
    async <T,>(url: string, method: "GET" | "POST" | "DELETE", body?: unknown): Promise<T | null> => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const res =
          method === "GET"
            ? await fetch(url, { cache: "no-store" })
            : await apiFetch(url, {
                method,
                headers: body ? { "Content-Type": "application/json" } : undefined,
                body: body ? JSON.stringify(body) : undefined,
              });
        const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
        if (!res.ok || !json || !json.ok) {
          setError(json?.error ?? "Xatolik yuz berdi");
          return null;
        }
        return json.data ?? null;
      } catch {
        setError("Tarmoq xatosi");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const loadMembers = useCallback(
    async (cohortId: string) => {
      const data = await request<CohortMember[]>(`/api/cohorts/${cohortId}/members`, "GET");
      setMembers(data ?? []);
      setMembersLoading(false);
    },
    [request],
  );

  function selectCohort(cohortId: string) {
    setSelectedId(cohortId);
    setMembers([]);
    setMembersLoading(true);
    void loadMembers(cohortId);
  }

  async function createCohort() {
    const data = await request<CohortItem>("/api/cohorts", "POST", {
      name,
      description: description.trim() ? description.trim() : null,
    });
    if (!data) return;
    setName("");
    setDescription("");
    setNotice("Kohort yaratildi");
    selectCohort(data.id);
    router.refresh();
  }

  async function searchUsers() {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const data = await request<UserOption[]>(
      `/api/admin/users?q=${encodeURIComponent(q)}&role=STUDENT`,
      "GET",
    );
    setResults(data ?? []);
  }

  async function addUsers(body: { userIds?: string[]; groupId?: string }) {
    if (!selectedId) return;
    const data = await request<{ added: number }>(`/api/cohorts/${selectedId}/members`, "POST", body);
    if (!data) return;
    setNotice(`${data.added} ta a'zo qo'shildi`);
    setResults([]);
    setQuery("");
    await loadMembers(selectedId);
    router.refresh();
  }

  async function removeMember(userId: string) {
    if (!selectedId) return;
    const data = await request<{ removed: number }>(`/api/cohorts/${selectedId}/members`, "DELETE", {
      userId,
    });
    if (!data) return;
    setNotice("A'zo chiqarildi");
    await loadMembers(selectedId);
    router.refresh();
  }

  async function enroll() {
    if (!selectedId || !courseId) return;
    const data = await request<{ enrolled: number }>(`/api/cohorts/${selectedId}/enroll`, "POST", {
      courseId,
    });
    if (!data) return;
    setNotice(`${data.enrolled} ta a'zo kursga yozildi`);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader title="Yangi kohort" subtitle="Global guruhlar — bir nechta kursga yozish uchun" />
          <CardBody className="space-y-3">
            <div>
              <Label htmlFor="cohort-name">Nomi</Label>
              <Input
                id="cohort-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masalan: 2026 qabul — AI2"
              />
            </div>
            <div>
              <Label htmlFor="cohort-description">Izoh</Label>
              <Textarea
                id="cohort-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Ixtiyoriy"
              />
            </div>
            <Button disabled={busy || name.trim().length < 2} onClick={() => void createCohort()}>
              Yaratish
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Kohortlar" subtitle={`${cohorts.length} ta`} />
          <CardBody className="space-y-2">
            {cohorts.length === 0 ? (
              <EmptyState title="Kohort yo'q" description="Birinchi kohortni yuqoridagi forma orqali yarating." />
            ) : (
              cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  type="button"
                  onClick={() => selectCohort(cohort.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                    cohort.id === selectedId
                      ? "border-brand-500 bg-brand-50/60"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">{cohort.name}</span>
                    {cohort.description ? (
                      <span className="block truncate text-xs text-slate-500">{cohort.description}</span>
                    ) : null}
                  </span>
                  <Badge tone="brand">{cohort.memberCount} ta a&apos;zo</Badge>
                </button>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {!selected ? (
          <EmptyState title="Kohort tanlanmagan" description="Ro'yxatdan kohort tanlang yoki yangisini yarating." />
        ) : (
          <>
            <Card>
              <CardHeader
                title={selected.name}
                subtitle={selected.description ?? "A'zolar va kursga yozish"}
                action={<Badge tone="brand">{members.length} ta a&apos;zo</Badge>}
              />
              <CardBody className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cohort-user-search">Talaba qidirish</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cohort-user-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Ism yoki email"
                      />
                      <Button variant="secondary" disabled={busy} onClick={() => void searchUsers()}>
                        Qidirish
                      </Button>
                    </div>
                    {results.length > 0 ? (
                      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
                        {results.map((result) => (
                          <li
                            key={result.id}
                            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-slate-800">{result.name}</span>
                              <span className="block truncate text-xs text-slate-500">{result.email}</span>
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => void addUsers({ userIds: [result.id] })}
                            >
                              Qo&apos;shish
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cohort-group">Guruh bo&apos;yicha qo&apos;shish</Label>
                    <Select
                      id="cohort-group"
                      value={groupId}
                      onChange={(event) => setGroupId(event.target.value)}
                    >
                      <option value="">Guruhni tanlang</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      disabled={busy || !groupId}
                      onClick={() => void addUsers({ groupId })}
                    >
                      Guruh talabalarini qo&apos;shish
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="A'zolar" subtitle="Kohort tarkibi" />
              <CardBody>
                {membersLoading ? (
                  <p className="text-sm text-slate-500">Yuklanmoqda...</p>
                ) : members.length === 0 ? (
                  <EmptyState title="A'zo yo'q" description="Talabalarni qidiruv yoki guruh orqali qo'shing." />
                ) : (
                  <Table>
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3 font-medium">Ism</th>
                        <th className="py-2 pr-3 font-medium">Email</th>
                        <th className="py-2 text-right font-medium">Amal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 pr-3 text-slate-800">{member.name}</td>
                          <td className="py-2 pr-3 text-slate-500">{member.email}</td>
                          <td className="py-2 text-right">
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              onClick={() => void removeMember(member.userId)}
                            >
                              Chiqarish
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Kursga yozish" subtitle="Barcha a'zolar tanlangan kursga yoziladi" />
              <CardBody className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="w-full">
                  <Label htmlFor="cohort-course">Kurs</Label>
                  <Select
                    id="cohort-course"
                    value={courseId}
                    onChange={(event) => setCourseId(event.target.value)}
                  >
                    <option value="">Kursni tanlang</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button disabled={busy || !courseId || members.length === 0} onClick={() => void enroll()}>
                  Kursga yozish
                </Button>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
