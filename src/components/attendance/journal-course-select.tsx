"use client";

import { useRouter } from "next/navigation";
import { Card, CardBody, Label, Select } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function JournalCourseSelect({
  courses,
  value,
}: {
  courses: { slug: string; title: string }[];
  value: string;
}) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Card>
      <CardBody className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-80">
          <Label>{t("schCourse")}</Label>
          <Select
            value={value}
            onChange={(event) => {
              router.push(`/journal?course=${encodeURIComponent(event.target.value)}`);
            }}
          >
            {courses.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.title}
              </option>
            ))}
          </Select>
        </div>
        <p className="pb-2 text-xs text-slate-600">
          {t("schJournalCourseHint")}
        </p>
      </CardBody>
    </Card>
  );
}
