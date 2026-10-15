import { getCurrentUser } from "@/lib/auth";
import { getEduPageClassTimetable, getEduPageTimetable } from "@/lib/edupage";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const className = url.searchParams.get("class");

  try {
    if (scope === "all") {
      const timetable = await getEduPageTimetable();
      return Response.json({ ok: true, data: timetable });
    }

    const timetable = await getEduPageClassTimetable(className);
    return Response.json({ ok: true, data: timetable });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "EduPage jadvali hozircha mavjud emas";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
