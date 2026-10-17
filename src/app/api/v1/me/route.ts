import { requireApiToken } from "@/modules/api-auth/token";

export async function GET(request: Request) {
  const auth = await requireApiToken(request);
  if (!auth.ok) return auth.response;

  const { user } = auth;
  return Response.json({
    ok: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
