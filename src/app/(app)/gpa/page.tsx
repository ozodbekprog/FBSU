import { requireUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { ButtonLink, PageHeader } from "@/components/ui";
import { getStudentGpa } from "@/app/api/gpa/data";
import { GpaCourseTable } from "@/components/gpa/gpa-course-table";
import { GpaEmpty } from "@/components/gpa/gpa-empty";
import { GpaHero } from "@/components/gpa/gpa-hero";
import { GpaScale } from "@/components/gpa/gpa-scale";

export default async function GpaPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const groupName = user.group?.name ?? dictionary.grdStudent;

  if (user.role !== "STUDENT") {
    return (
      <>
        <PageHeader
          title="GPA"
          subtitle={dictionary.grdGpaScaleSubtitle}
          eyebrow={dictionary.grdAcademicResult}
          action={<ButtonLink href="/bonus-points">{dictionary.grdBonusPoints}</ButtonLink>}
        />
        <GpaEmpty
          title={dictionary.grdStudentAccountRequired}
          description={dictionary.grdStudentAccountDesc}
        />
      </>
    );
  }

  const data = await getStudentGpa(user.id);

  if (data.gpa == null || data.courses.length === 0) {
    return (
      <>
        <PageHeader
          title="GPA"
          subtitle={`${groupName} · ${dictionary.grdGpaScaleSubtitle}`}
          eyebrow={dictionary.grdAcademicResult}
        />
        <GpaEmpty
          title={dictionary.grdGpaNotCalculated}
          description={dictionary.grdGpaNotCalculatedDesc}
          action={<ButtonLink href="/courses">{dictionary.grdViewCourses}</ButtonLink>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="GPA"
        subtitle={`${groupName} · ${dictionary.grdGpaScaleSubtitle}`}
        eyebrow={dictionary.grdAcademicResult}
        action={<ButtonLink href="/bonus-points">{dictionary.grdMyBonusPoints}</ButtonLink>}
      />
      <GpaHero data={data} />
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_21rem]">
        <GpaCourseTable data={data} delay={80} />
        <GpaScale delay={160} />
      </div>
    </>
  );
}
