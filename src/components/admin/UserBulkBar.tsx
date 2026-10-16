"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export type BulkUserOption = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};

type BulkAction = "activate" | "deactivate";

export default function UserBulkBar({ users }: { users: BulkUserOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
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
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; data?: { updated: number }; error?: string }
        | null;
      if (!res.ok || !json || !json.ok) {
        setError(json?.error ?? "Xatolik yuz berdi");
        return;
      }
      setSelected([]);
      setNotice(
        action === "activate"
          ? `${json.data?.updated ?? 0} ta foydalanuvchi faollashtirildi`
          : `${json.data?.updated ?? 0} ta foydalanuvchi faolsizlantirildi`,
      );
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
          {notice ? <span className="text-sm font-medium text-emerald-600">{notice}</span> : null}
          {error ? <span className="text-sm font-medium text-rose-600">{error}</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}
