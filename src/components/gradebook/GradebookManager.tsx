"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, Input, Label, Select, Table } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Category = { id: string; name: string; weight: number };
type Item = { id: string; name: string; categoryId: string | null; maxScore: number; weight: number };
type Student = { id: string; name: string };
type Score = { itemId: string; studentId: string; score: number };
type RefOption = { id: string; title: string };
type ItemSource = "manual" | "assignment" | "quiz";

type Props = {
  courseId: string;
  categories: Category[];
  items: Item[];
  students: Student[];
  scores: Score[];
  assignments: RefOption[];
  quizzes: RefOption[];
};

type ApiResponse = { ok: boolean; data?: unknown; error?: string };

const cellKey = (itemId: string, studentId: string) => `${itemId}:${studentId}`;

function buildValues(scores: Score[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const score of scores) values[cellKey(score.itemId, score.studentId)] = String(score.score);
  return values;
}

export default function GradebookManager({
  courseId,
  categories,
  items,
  students,
  scores,
  assignments,
  quizzes,
}: Props) {
  const router = useRouter();

  const [categoryName, setCategoryName] = useState("");
  const [categoryWeight, setCategoryWeight] = useState("10");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [categoryDeleting, setCategoryDeleting] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemSource, setItemSource] = useState<ItemSource>("manual");
  const [itemRefId, setItemRefId] = useState("");
  const [itemWeight, setItemWeight] = useState("0");
  const [itemMaxScore, setItemMaxScore] = useState("100");
  const [itemBusy, setItemBusy] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemNotice, setItemNotice] = useState<string | null>(null);
  const [itemDeleting, setItemDeleting] = useState<string | null>(null);

  const [values, setValues] = useState<Record<string, string>>(() => buildValues(scores));
  const [saving, setSaving] = useState<string | null>(null);
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});

  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setValues(buildValues(scores));
  }, [scores]);

  async function submitCategory() {
    const name = categoryName.trim();
    const weight = Number(categoryWeight);
    if (!name) {
      setCategoryError("Nom kiritilishi shart");
      return;
    }
    if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
      setCategoryError("Vazn 0 va 100 orasida butun son bo'lishi kerak");
      return;
    }
    setCategoryBusy(true);
    setCategoryError(null);
    setCategoryNotice(null);
    try {
      const res = await apiFetch("/api/gradebook/categories", {
        method: "POST",
        body: JSON.stringify({ courseId, name, weight }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        setCategoryError(json?.error ?? "Kategoriya qo'shilmadi");
        return;
      }
      setCategoryName("");
      setCategoryWeight("10");
      setCategoryNotice("Kategoriya qo'shildi");
      router.refresh();
    } catch {
      setCategoryError("Tarmoq xatosi");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("Kategoriya o'chirilsinmi? Ustunlar kategoriyasiz qoladi.")) return;
    setCategoryDeleting(id);
    setCategoryError(null);
    setCategoryNotice(null);
    try {
      const res = await apiFetch(`/api/gradebook/categories/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        setCategoryError(json?.error ?? "Kategoriya o'chirilmadi");
        return;
      }
      setCategoryNotice("Kategoriya o'chirildi");
      router.refresh();
    } catch {
      setCategoryError("Tarmoq xatosi");
    } finally {
      setCategoryDeleting(null);
    }
  }

  async function submitItem() {
    const name = itemName.trim();
    const weight = Number(itemWeight);
    const maxScore = Number(itemMaxScore);
    if (!name) {
      setItemError("Nom kiritilishi shart");
      return;
    }
    if (!Number.isInteger(weight) || weight < 0) {
      setItemError("Vazn noldan kichik bo'lmagan butun son bo'lishi kerak");
      return;
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      setItemError("Maksimal ball noldan katta bo'lishi kerak");
      return;
    }
    if (itemSource !== "manual") {
      const options = itemSource === "assignment" ? assignments : quizzes;
      const label = itemSource === "assignment" ? "topshiriq" : "test";
      if (options.length === 0) {
        setItemError(`Bu kursda ${label} mavjud emas`);
        return;
      }
      if (!itemRefId) {
        setItemError(`${label.charAt(0).toUpperCase()}${label.slice(1)} tanlanishi shart`);
        return;
      }
    }
    setItemBusy(true);
    setItemError(null);
    setItemNotice(null);
    try {
      const payload: Record<string, unknown> = {
        courseId,
        categoryId: itemCategoryId || null,
        name,
        weight,
        maxScore,
      };
      if (itemSource !== "manual") {
        payload.source = itemSource === "assignment" ? "ASSIGNMENT" : "QUIZ";
        payload.refId = itemRefId;
      }
      const res = await apiFetch("/api/gradebook/items", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        setItemError(json?.error ?? "Ustun qo'shilmadi");
        return;
      }
      setItemName("");
      setItemCategoryId("");
      setItemSource("manual");
      setItemRefId("");
      setItemWeight("0");
      setItemMaxScore("100");
      setItemNotice("Ustun qo'shildi");
      router.refresh();
    } catch {
      setItemError("Tarmoq xatosi");
    } finally {
      setItemBusy(false);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Ustun va unga tegishli barcha ballar o'chirilsinmi?")) return;
    setItemDeleting(id);
    setItemError(null);
    setItemNotice(null);
    try {
      const res = await apiFetch(`/api/gradebook/items/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        setItemError(json?.error ?? "Ustun o'chirilmadi");
        return;
      }
      setItemNotice("Ustun o'chirildi");
      router.refresh();
    } catch {
      setItemError("Tarmoq xatosi");
    } finally {
      setItemDeleting(null);
    }
  }

  async function saveScore(item: Item, student: Student) {
    const key = cellKey(item.id, student.id);
    const raw = (values[key] ?? "").trim();
    setScoreErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (raw === "") return;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > item.maxScore) {
      setScoreErrors((prev) => ({
        ...prev,
        [key]: `0 - ${item.maxScore} orasida`,
      }));
      return;
    }
    const original = scores.find((entry) => entry.itemId === item.id && entry.studentId === student.id);
    if (original && original.score === score) return;
    setSaving(key);
    try {
      const res = await apiFetch("/api/gradebook/scores", {
        method: "PUT",
        body: JSON.stringify({ itemId: item.id, studentId: student.id, score }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        setScoreErrors((prev) => ({ ...prev, [key]: json?.error ?? "Saqlanmadi" }));
        return;
      }
      router.refresh();
    } catch {
      setScoreErrors((prev) => ({ ...prev, [key]: "Tarmoq xatosi" }));
    } finally {
      setSaving(null);
    }
  }

  async function runSync() {
    setSyncBusy(true);
    setSyncError(null);
    setSyncNotice(null);
    try {
      const res = await apiFetch("/api/gradebook/sync", {
        method: "POST",
        body: JSON.stringify({ courseId }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json?.ok) {
        setSyncError(json?.error ?? "Sinxronlash amalga oshmadi");
        return;
      }
      const data = json.data as { synced?: number } | undefined;
      setSyncNotice(`${data?.synced ?? 0} ta baho sinxronlandi`);
      router.refresh();
    } catch {
      setSyncError("Tarmoq xatosi");
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Topshiriq va testlardan baholarni avtomatik sinxronlash.
          </p>
          <div className="flex items-center gap-3">
            {syncNotice ? <Badge tone="green">{syncNotice}</Badge> : null}
            {syncError ? <span className="text-sm text-rose-600">{syncError}</span> : null}
            <Button disabled={syncBusy} onClick={runSync}>
              {syncBusy ? "Sinxronlanmoqda..." : "Sinxronlash"}
            </Button>
          </div>
        </CardBody>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Kategoriyalar"
            subtitle={`${categories.length} ta kategoriya`}
            action={categoryNotice ? <Badge tone="green">{categoryNotice}</Badge> : null}
          />
          <CardBody className="space-y-4">
            {categories.length > 0 ? (
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3.5 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                      {category.name}
                      <span className="ml-1 font-normal text-slate-400">({category.weight}%)</span>
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={categoryDeleting === category.id}
                      onClick={() => deleteCategory(category.id)}
                    >
                      O&apos;chirish
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Hali kategoriya yo&apos;q.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <div>
                <Label htmlFor="category-name">Nom</Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  maxLength={120}
                  disabled={categoryBusy}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category-weight">Vazn %</Label>
                <Input
                  id="category-weight"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={categoryWeight}
                  disabled={categoryBusy}
                  onChange={(event) => setCategoryWeight(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={categoryBusy} onClick={submitCategory}>
                Kategoriya qo&apos;shish
              </Button>
              {categoryError ? <span className="text-sm text-rose-600">{categoryError}</span> : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Ustunlar"
            subtitle={`${items.length} ta ustun`}
            action={itemNotice ? <Badge tone="green">{itemNotice}</Badge> : null}
          />
          <CardBody className="space-y-4">
            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => {
                  const category = categories.find((entry) => entry.id === item.categoryId);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3.5 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {item.name}
                        <span className="ml-1 font-normal text-slate-400">
                          · {category ? category.name : "kategoriyasiz"} · maks {item.maxScore}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={itemDeleting === item.id}
                        onClick={() => deleteItem(item.id)}
                      >
                        O&apos;chirish
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Hali ustun yo&apos;q.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="item-name">Nom</Label>
                <Input
                  id="item-name"
                  value={itemName}
                  maxLength={120}
                  disabled={itemBusy}
                  onChange={(event) => setItemName(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="item-category">Kategoriya</Label>
                <Select
                  id="item-category"
                  value={itemCategoryId}
                  disabled={itemBusy}
                  onChange={(event) => setItemCategoryId(event.target.value)}
                >
                  <option value="">Kategoriyasiz</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="item-source">Manba</Label>
                <Select
                  id="item-source"
                  value={itemSource}
                  disabled={itemBusy}
                  onChange={(event) => {
                    setItemSource(event.target.value as ItemSource);
                    setItemRefId("");
                  }}
                >
                  <option value="manual">Qo&apos;lda</option>
                  <option value="assignment">Topshiriq</option>
                  <option value="quiz">Test</option>
                </Select>
              </div>
              {itemSource !== "manual" ? (
                <div>
                  <Label htmlFor="item-ref">
                    {itemSource === "assignment" ? "Topshiriq" : "Test"}
                  </Label>
                  <Select
                    id="item-ref"
                    value={itemRefId}
                    disabled={itemBusy}
                    onChange={(event) => setItemRefId(event.target.value)}
                  >
                    <option value="">Tanlang</option>
                    {(itemSource === "assignment" ? assignments : quizzes).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div>
                <Label htmlFor="item-weight">Vazn</Label>
                <Input
                  id="item-weight"
                  type="number"
                  min={0}
                  step={1}
                  value={itemWeight}
                  disabled={itemBusy}
                  onChange={(event) => setItemWeight(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="item-max">Maksimal ball</Label>
                <Input
                  id="item-max"
                  type="number"
                  min={0}
                  step={0.5}
                  value={itemMaxScore}
                  disabled={itemBusy}
                  onChange={(event) => setItemMaxScore(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={itemBusy} onClick={submitItem}>
                Ustun qo&apos;shish
              </Button>
              {itemError ? <span className="text-sm text-rose-600">{itemError}</span> : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Ballar kiritish" subtitle={`${students.length} talaba · ${items.length} ustun`} />
        {students.length > 0 && items.length > 0 ? (
          <Table className="max-h-[68vh] overflow-y-auto">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-3 text-left backdrop-blur">
                  Talaba
                </th>
                {items.map((item) => (
                  <th
                    key={item.id}
                    className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-5 py-3 text-center backdrop-blur"
                  >
                    {item.name}
                    <span className="ml-1 font-normal text-slate-400">({item.maxScore})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{student.name}</td>
                  {items.map((item) => {
                    const key = cellKey(item.id, student.id);
                    const error = scoreErrors[key];
                    return (
                      <td key={item.id} className="px-5 py-3 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={item.maxScore}
                          step={0.5}
                          value={values[key] ?? ""}
                          disabled={saving === key}
                          onChange={(event) =>
                            setValues((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                          onBlur={() => saveScore(item, student)}
                          className="mx-auto w-20 text-center"
                        />
                        {error ? <p className="mt-1 text-[11px] text-rose-600">{error}</p> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <CardBody>
            <p className="text-sm text-slate-500">
              Ballar kiritish uchun avval kategoriya va ustunlar qo&apos;shing, talabalar esa kursga
              yozilgan bo&apos;lishi kerak.
            </p>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
