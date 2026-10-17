"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Label, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type ApiResult = {
  ok?: boolean;
  error?: string;
  data?: { enrolled?: number } | null;
} | null;

export function CourseSettingsCard({
  courseId,
  selfEnrollment,
  groups,
}: {
  courseId: string;
  selfEnrollment: boolean;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selfEnrollEnabled, setSelfEnrollEnabled] = useState(selfEnrollment);
  const [savingSelfEnroll, setSavingSelfEnroll] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onToggleSelfEnrollment(next: boolean) {
    setSavingSelfEnroll(true);
    setError(null);
    setMessage(null);
    setSelfEnrollEnabled(next);
    try {
      const res = await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ selfEnrollment: next }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult;
      if (!res.ok || !json?.ok) {
        setSelfEnrollEnabled(!next);
        setError(json?.error ?? "Sozlamani saqlashda xatolik yuz berdi");
        return;
      }
      setMessage(
        next
          ? "Talabalarning o'zi kursga yozilishi yoqildi"
          : "Talabalarning o'zi kursga yozilishi o'chirildi",
      );
      router.refresh();
    } catch {
      setSelfEnrollEnabled(!next);
      setError("Tarmoq xatosi");
    } finally {
      setSavingSelfEnroll(false);
    }
  }

  async function onEnrollGroup() {
    if (!groupId) {
      setError("Guruh tanlanmagan");
      return;
    }
    setEnrolling(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/courses/${courseId}/enroll-group`, {
        method: "POST",
        body: JSON.stringify({ groupId }),
      });
      const json = (await res.json().catch(() => null)) as ApiResult;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Guruhni yozishda xatolik yuz berdi");
        return;
      }
      setMessage(`${json.data?.enrolled ?? 0} ta talaba yozildi`);
      router.refresh();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Kurs sozlamalari" subtitle="Yozilish qoidalari va guruhlar" />
      <CardBody className="space-y-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 disabled:cursor-not-allowed"
            checked={selfEnrollEnabled}
            disabled={savingSelfEnroll}
            onChange={(event) => void onToggleSelfEnrollment(event.target.checked)}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-800">
              O'z-o'zidan yozilish
            </span>
            <span className="block text-xs text-slate-500">
              Talabalar kursga o'zi yozila oladi
            </span>
          </span>
        </label>

        <div className="border-t border-slate-100 pt-4">
          <Label htmlFor="course-settings-group">Guruhni kursga yozish</Label>
          {groups.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                id="course-settings-group"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                disabled={enrolling}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
              <Button onClick={onEnrollGroup} disabled={enrolling || !groupId} className="shrink-0">
                {enrolling ? "Yozilmoqda..." : "Guruhni yozish"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Kursga bog'langan guruh yo'q. Avval o'quv rejasida guruhni biriktiring.
            </p>
          )}
        </div>

        {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </CardBody>
    </Card>
  );
}
