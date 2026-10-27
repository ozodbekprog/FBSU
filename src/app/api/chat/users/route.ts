import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { textMatches } from "@/lib/encrypted-search";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json({ ok: true, data: { users: [] } });
  }

  const candidates = await prisma.user.findMany({
    where: { isActive: true, id: { not: user.id } },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    take: 2000,
  });

  const users = candidates
    .filter((candidate) => textMatches(q, [candidate.name, candidate.email]))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      avatarUrl: candidate.avatarUrl,
      role: candidate.role,
    }));

  return Response.json({ ok: true, data: { users } });
}
