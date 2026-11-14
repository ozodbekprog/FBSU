import { sendDailyTelegramReminders } from "@/server/telegram/daily";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  try {
    const result = await sendDailyTelegramReminders({
      force: url.searchParams.get("force") === "1",
    });
    return Response.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram kunlik eslatmada xato";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
