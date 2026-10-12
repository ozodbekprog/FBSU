import { prisma } from "@/lib/prisma";
import { buildBadge, signBadge } from "@/lib/openbadge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true } },
      course: { select: { title: true, description: true } },
    },
  });

  if (!certificate) {
    return Response.json(
      { ok: false, error: "Sertifikat topilmadi" },
      { status: 404 },
    );
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "Server sozlamasi yetishmagan" },
      { status: 500 },
    );
  }

  const baseUrl = new URL(request.url).origin;

  const badge = buildBadge({
    certificateId: certificate.id,
    recipientName: certificate.student.name,
    achievementName: certificate.course.title,
    achievementDescription:
      certificate.course.description ??
      "Kursni muvaffaqiyatli tamomlaganlik sertifikati",
    issuerName: "FBSU",
    issuedAt: certificate.issuedAt.toISOString(),
    grade: certificate.grade,
    baseUrl,
  });

  const signed = await signBadge(badge, secret);

  return Response.json(signed, {
    headers: {
      "content-type": "application/ld+json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
