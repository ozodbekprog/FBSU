import { APP_CHANNEL, APP_RELEASED_AT, APP_VERSION, RELEASES } from "@/lib/version";

export function GET() {
  return Response.json(
    {
      ok: true,
      data: {
        version: APP_VERSION,
        channel: APP_CHANNEL,
        releasedAt: APP_RELEASED_AT,
        releases: RELEASES,
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
