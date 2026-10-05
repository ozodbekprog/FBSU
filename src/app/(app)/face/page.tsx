import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { FaceEnroll } from "@/components/face/face-enroll";
import { isValidFaceDescriptor } from "@/modules/attendance/face";

export default async function FacePage() {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { faceDescriptor: true, faceEnrolledAt: true },
  });
  return (
    <>
      <PageHeader title={dictionary.schFaceTitle} subtitle={dictionary.schFacePageSubtitle} />
      <FaceEnroll
        enrolled={isValidFaceDescriptor(row?.faceDescriptor)}
        enrolledAt={row?.faceEnrolledAt?.toISOString() ?? null}
      />
    </>
  );
}
