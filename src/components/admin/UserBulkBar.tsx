"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export type BulkUserOption = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

export type BulkGroupOption = {
  id: string;
  name: string;
};

type BulkAction = "activate" | "deactivate" | "assignGroup";

export default function UserBulkBar({
  users,
  groups,
}: {
  users: BulkUserOption[];
  groups: BulkGroupOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = users.length > 0 && selected.length === users.length;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? [] : users.map((user) => user.id));
  }

  async function run(action: BulkAction) {
    if (selected.length === 0) return;
    if (action === "assignGroup" && !groupId) {
      setNotice(null);
      setError("Avval guruhni tanlang");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "assignGroup" ? { ids: selected, action, groupId } : { ids: selected, action }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; data?: { updated: number }; error?: string }
        | null;
      if (!res.ok || !json || !json.ok) {
        setError(json?.error ?? "Xatolik yuz berdi");
        return;
      }
      const updated = json.data?.updated ?? 0;
      setSelected([]);
      setNotice(
        action === "activate"
          ? `${updated} ta foydalanuvchi faollashtirildi`
          : action === "deactivate"
            ? `${updated} ta foydalanuvchi faolsizlantirildi`
            : `${updated} ta foydalanuvchi guruhga qo'shildi`,
      );
      if (action === "assignGroup") setGroupId("");
      router.refresh();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }

  if (users.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader
        title="Ommaviy amallar"
        subtitle={`${selected.length} ta tanlandi`}
        action={
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            {allSelected ? "Bekor qilish" : "Hammasini tanlash"}
          </Button>
        }
      />
      <CardBody className="space-y-3">
        <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100">
          {users.map((user) => (
            <label
              key={user.id}
              className="flex items-center gap-3 border-b border-slate-50 px-3 py-2 text-sm last:border-0 hover:bg-slate-50/60"
            >
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={selectedSet.has(user.id)}
                onChange={() => toggle(user.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">{user.name}</span>
                <span className="block truncate text-xs text-slate-500">{user.email}</span>
              </span>
              <span className={user.isActive ? "text-xs text-emerald-600" : "text-xs text-slate-400"}>
                {user.isActive ? "Faol" : "Nofaol"}
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={busy || selected.length === 0} onClick={() => run("activate")}>
            Faollashtirish
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || selected.length === 0}
            onClick={() => run("deactivate")}
          >
            Faolsizlantirish
          </Button>
          <Select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            disabled={busy || groups.length === 0}
            className="w-full sm:w-56!"
          >
            <option value="">{groups.length === 0 ? "Guruhlar yo'q" : "Guruhni tanlang"}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            disabled={busy || selected.length === 0 || !groupId}
            onClick={() => run("assignGroup")}
          >
            Guruhga qo&apos;shish
          </Button>
          {notice ? <span className="text-sm font-medium text-emerald-600">{notice}</span> : null}
          {error ? <span className="text-sm font-medium text-rose-600">{error}</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}
