import { requireRole } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { CourseForm } from "@/components/courses/course-form";

export default async function NewCoursePage() {
  await requireRole(["TEACHER", "ADMIN"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <PageHeader title={dictionary.crsNewCourse} subtitle={dictionary.crsNewCourseSubtitle} />
      <CourseForm />
    </>
  );
}
