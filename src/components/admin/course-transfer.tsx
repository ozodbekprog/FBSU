"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button, Card, CardBody, CardHeader, Input, Label, Select } from "@/components/ui";

type CourseOption = { id: string; slug: string; title: string };

type ImportResponse = {
  ok: boolean;
  data?: { courseId: string; slug: string; title: string };
  error?: string;
};

function filenameFrom(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export default function CourseTransfer({ courses }: { courses: CourseOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(courses[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!selected) {
      setError("Avval kursni tanlang");
      return;
    }
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(`/api/courses/${selected}/export`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(json?.error ?? "Eksport amalga oshmadi");
        return;
      }
      const course = courses.find((item) => item.id === selected);
      const filename = filenameFrom(
        res.headers.get("content-disposition"),
        `${course?.slug ?? "kurs"}-backup.json`,
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(`Fayl yuklab olindi: ${filename}`);
    } catch {
      setError("Eksport amalga oshmadi");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (!file) {
      setError("Import uchun JSON faylni tanlang");
      return;
    }

    setImporting(true);
    setError(null);
    setNotice(null);

    let payload: unknown;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
    } catch {
      setImporting(false);
      setError("Fayl JSON formatida emas");
      return;
    }

    try {
      const res = await apiFetch("/api/courses/import", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as ImportResponse | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? "Import amalga oshmadi");
        return;
      }
      setNotice(`Kurs yaratildi: ${json.data.title}`);
      setFile(null);
      setFileKey((value) => value + 1);
      router.refresh();
    } catch {
      setError("Import amalga oshmadi");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="animate-fade-up">
      <CardHeader
        title="Kursni ko'chirish"
        subtitle="Kursni JSON nusxasi sifatida yuklab oling yoki boshqa kursdan import qiling"
      />
      <CardBody className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <Label htmlFor="course-transfer-select">Kurs</Label>
            <Select
              id="course-transfer-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={courses.length === 0}
            >
              {courses.length === 0 ? <option value="">Kurs mavjud emas</option> : null}
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={exporting || !selected}
            onClick={handleExport}
          >
            {exporting ? "Eksport qilinmoqda..." : "Eksport"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <Label htmlFor="course-transfer-file">Import fayli (JSON)</Label>
            <Input
              id="course-transfer-file"
              key={fileKey}
              type="file"
              accept="application/json,.json"
              disabled={importing}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={importing}
            onClick={handleImport}
          >
            {importing ? "Import qilinmoqda..." : "Import"}
          </Button>
        </div>

        {notice ? <p className="text-sm font-medium text-emerald-600">{notice}</p> : null}
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        <p className="text-xs text-slate-500">
          Import natijasida yangi kurs yaratiladi; test savollari (question bank) ko'chirilmaydi.
        </p>
      </CardBody>
    </Card>
  );
}
