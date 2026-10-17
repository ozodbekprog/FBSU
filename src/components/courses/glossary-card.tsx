"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
  createdBy: { name: string } | null;
};

type ListResponse = {
  ok?: boolean;
  error?: string;
  data?: { entries: GlossaryEntry[]; canManage: boolean };
} | null;

type EntryResponse = {
  ok?: boolean;
  error?: string;
  data?: GlossaryEntry;
} | null;

export function GlossaryCard({
  courseId,
  canManage,
}: {
  courseId: string;
  canManage: boolean;
}) {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (search: string) => {
      setError(null);
      try {
        const url = search
          ? `/api/courses/${courseId}/glossary?q=${encodeURIComponent(search)}`
          : `/api/courses/${courseId}/glossary`;
        const res = await apiFetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as ListResponse;
        if (!res.ok || !json?.ok) {
          setError(json?.error ?? "Glossariyni yuklashda xatolik yuz berdi");
          return;
        }
        setEntries(json.data?.entries ?? []);
      } catch {
        setError("Tarmoq xatosi");
      } finally {
        setLoading(false);
      }
    },
    [courseId],
  );

  useEffect(() => {
    void load("");
  }, [load]);

  function resetForm() {
    setTerm("");
    setDefinition("");
    setShowForm(false);
  }

  async function onCreate() {
    if (!term.trim() || !definition.trim()) {
      setError("Atama va izoh kiritilishi shart");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/courses/${courseId}/glossary`, {
        method: "POST",
        body: JSON.stringify({ term: term.trim(), definition: definition.trim() }),
      });
      const json = (await res.json().catch(() => null)) as EntryResponse;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Atama qo'shishda xatolik yuz berdi");
        return;
      }
      resetForm();
      await load(query.trim());
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(entry: GlossaryEntry) {
    setEditingId(entry.id);
    setEditTerm(entry.term);
    setEditDefinition(entry.definition);
    setError(null);
  }

  async function onSaveEdit(id: string) {
    if (!editTerm.trim() || !editDefinition.trim()) {
      setError("Atama va izoh kiritilishi shart");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/glossary/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ term: editTerm.trim(), definition: editDefinition.trim() }),
      });
      const json = (await res.json().catch(() => null)) as EntryResponse;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Tahrirlashda xatolik yuz berdi");
        return;
      }
      setEditingId(null);
      await load(query.trim());
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(entry: GlossaryEntry) {
    if (!window.confirm(`"${entry.term}" atamasi o'chirilsinmi?`)) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/glossary/${entry.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "O'chirishda xatolik yuz berdi");
        return;
      }
      await load(query.trim());
    } catch {
      setError("Tarmoq xatosi");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Glossariy"
        subtitle="Kurs atamalari va izohlari"
        action={
          canManage ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowForm((value) => !value)}
            >
              {showForm ? "Yopish" : "Atama qo'shish"}
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void load(query.trim());
          }}
        >
          <div className="min-w-0 flex-1">
            <Label htmlFor="glossary-search">Qidirish</Label>
            <Input
              id="glossary-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Atama yoki izoh bo'yicha"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Qidirish
          </Button>
        </form>

        {canManage && showForm ? (
          <div className="space-y-3 rounded-xl border border-slate-200/70 p-4">
            <div>
              <Label htmlFor="glossary-term">Atama</Label>
              <Input
                id="glossary-term"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Masalan: Algoritm"
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="glossary-definition">Izoh</Label>
              <Textarea
                id="glossary-definition"
                rows={3}
                value={definition}
                onChange={(event) => setDefinition(event.target.value)}
                placeholder="Atamaning izohi"
                disabled={creating}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onCreate} disabled={creating}>
                {creating ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm} disabled={creating}>
                Bekor qilish
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Yuklanmoqda...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Hozircha atama yo'q.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isOpen = openId === entry.id;
              const isEditing = editingId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200/70 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setOpenId(isOpen ? null : entry.id)}
                    >
                      <span className="block text-sm font-medium text-slate-900">
                        {entry.term}
                      </span>
                      {entry.createdBy ? (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {entry.createdBy.name}
                        </span>
                      ) : null}
                    </button>
                    {canManage ? (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(entry)}
                        >
                          Tahrirlash
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={() => void onDelete(entry)}
                        >
                          O'chirish
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-2">
                      <Input
                        value={editTerm}
                        onChange={(event) => setEditTerm(event.target.value)}
                        disabled={saving}
                      />
                      <Textarea
                        rows={3}
                        value={editDefinition}
                        onChange={(event) => setEditDefinition(event.target.value)}
                        disabled={saving}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void onSaveEdit(entry.id)}
                          disabled={saving}
                        >
                          {saving ? "Saqlanmoqda..." : "Saqlash"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                        >
                          Bekor qilish
                        </Button>
                      </div>
                    </div>
                  ) : isOpen ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {entry.definition}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </CardBody>
    </Card>
  );
}
