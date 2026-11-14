import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.max(7, Number(process.env.TRAFFIC_RETENTION_DAYS ?? 90));
  const cutoff = new Date(Date.now() - days * 86_400_000);

  const views = await prisma.trafficPageView.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const sessions = await prisma.trafficSession.deleteMany({
    where: { startedAt: { lt: cutoff } },
  });

  return Response.json({
    ok: true,
    data: { days, views: views.count, sessions: sessions.count },
  });
}
