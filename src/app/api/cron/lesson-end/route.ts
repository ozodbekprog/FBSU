import { sendLessonEndAlerts } from "@/server/telegram/lesson-end";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendLessonEndAlerts();
    return Response.json({ ok: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dars tugash eslatmalarida xato";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
