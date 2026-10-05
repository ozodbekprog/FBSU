import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { StatsRow } from "@/components/profile/StatsRow";
import type { ProfileStatKind } from "@/components/profile/StatsRow";
import { getDictionary, getLocale } from "@/i18n";

export default async function ProfilePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  let coursesCount = 0;
  let certificatesCount = 0;
  let coursesHint = dictionary.mscProfileStatTotalCourses;
  let thirdLabel = dictionary.mscProfileStatInfo;
  let thirdValue: string | number = "—";
  let thirdHint: string | undefined;
  let thirdKind: ProfileStatKind = "users";

  if (user.role === "STUDENT") {
    const [enrollments, certificates, graded] = await Promise.all([
      prisma.enrollment.count({ where: { userId: user.id } }),
      prisma.certificate.count({ where: { studentId: user.id } }),
      prisma.submission.findMany({
        where: { studentId: user.id, status: "GRADED", score: { not: null } },
        select: { score: true, assignment: { select: { maxScore: true } } },
      }),
    ]);
    coursesCount = enrollments;
    certificatesCount = certificates;
    coursesHint = dictionary.mscProfileStatEnrolledCourses;
    const percents = graded.map((item) =>
      item.assignment.maxScore > 0 ? (item.score ?? 0) / item.assignment.maxScore : 0,
    );
    thirdLabel = dictionary.mscProfileStatAverage;
    thirdValue = percents.length
      ? `${Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 100)}%`
      : "—";
    thirdHint = percents.length
      ? dictionary.mscProfileStatGradedCount.replace("{count}", String(percents.length))
      : dictionary.mscProfileStatNoGrade;
    thirdKind = "average";
  } else if (user.role === "TEACHER") {
    const [courses, certificates, students] = await Promise.all([
      prisma.course.count({ where: { teacherId: user.id } }),
      prisma.certificate.count({ where: { issuedById: user.id } }),
      prisma.enrollment.findMany({
        where: { course: { teacherId: user.id }, status: "ACTIVE" },
        distinct: ["userId"],
        select: { userId: true },
      }),
    ]);
    coursesCount = courses;
    certificatesCount = certificates;
    coursesHint = dictionary.mscProfileStatTeachingCourses;
    thirdLabel = dictionary.mscProfileStatStudents;
    thirdValue = students.length;
    thirdHint = dictionary.mscProfileStatEnrolledInCourses;
    thirdKind = "students";
  } else {
    const [courses, certificates, users] = await Promise.all([
      prisma.course.count(),
      prisma.certificate.count(),
      prisma.user.count({ where: { isActive: true } }),
    ]);
    coursesCount = courses;
    certificatesCount = certificates;
    coursesHint = dictionary.mscProfileStatSystemCourses;
    thirdLabel = dictionary.mscProfileStatUsers;
    thirdValue = users;
    thirdHint = dictionary.mscProfileStatActiveAccounts;
    thirdKind = "users";
  }

  return (
    <>
      <PageHeader
        eyebrow={dictionary.mscProfileEyebrow}
        title={dictionary.mscProfileTitle}
        subtitle={dictionary.mscProfileSubtitle}
      />
      <ProfileHero
        name={user.name}
        email={user.email}
        role={user.role}
        avatarUrl={user.avatarUrl}
        coverUrl={user.coverUrl}
        bio={user.bio}
        createdAt={user.createdAt}
        groupName={user.group?.name ?? null}
        avatar={<AvatarUpload name={user.name} src={user.avatarUrl} className="shadow-xl" />}
      />
      <div className="mt-6">
        <StatsRow
          items={[
            {
              kind: "courses",
              label: dictionary.mscProfileStatCourses,
              value: coursesCount,
              hint: coursesHint,
            },
            {
              kind: "certificates",
              label: dictionary.mscProfileStatCertificates,
              value: certificatesCount,
              hint: dictionary.mscProfileStatTotalCertificates,
            },
            {
              kind: thirdKind,
              label: thirdLabel,
              value: thirdValue,
              hint: thirdHint,
            },
          ]}
        />
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <ProfileForm initialName={user.name} initialBio={user.bio} avatarUrl={user.avatarUrl} />
        <PasswordForm />
      </div>
    </>
  );
}
