import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { ButtonLink, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { EduPageBoard } from "@/components/schedule/edupage-board";
import { autoSyncEduPageSchedule, readEduPageSyncState } from "@/lib/edupage-sync";
import {
  EDUPAGE_REVALIDATE_SECONDS,
  getEduPageTimetable,
  findEduPageClass,
  normalizeClassName,
  type EduPageTimetable,
} from "@/lib/edupage";

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

function tashkentWeekday(): number {
  const shifted = new Date(Date.now() + TASHKENT_OFFSET_MS);
  return shifted.getUTCDay() === 0 ? 7 : shifted.getUTCDay();
}

async function loadTimetable(): Promise<{ data: EduPageTimetable | null; error: string | null }> {
  try {
    return { data: await getEduPageTimetable(), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "EduPage javob bermadi";
    return { data: null, error: message };
  }
}

export default async function EduPageSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  after(() => autoSyncEduPageSchedule());
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;

  const { data: timetable, error } = await loadTimetable();

  if (!timetable) {
    return (
      <>
        <PageHeader
          eyebrow={dictionary.schEduPageEyebrow}
          title={dictionary.schEduPageTitle}
          subtitle={dictionary.schEduPageSubtitle.replace("{name}", "ttp u.edupage.org")}
        />
        <Card>
          <CardBody>
            <EmptyState
              title={dictionary.schEduPageUnavailable}
              description={error ?? dictionary.schEduPageUnavailableDesc}
              action={
                <ButtonLink href="https://ttpu.edupage.org/timetable/" variant="secondary" size="sm">
                  {dictionary.schEduPageSource}
                </ButtonLink>
              }
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const groups = await prisma.group.findMany({
    select: { id: true, name: true, edupageName: true },
  });

  const requested = typeof params.class === "string" ? params.class : null;
  const group = groups.find((item) => item.id === user.groupId) ?? null;

  const linkedClassNames = groups
    .map((item) => item.edupageName || item.name)
    .filter((name) => timetable.classes.some((cls) => normalizeClassName(cls.name) === normalizeClassName(name)));

  const selected =
    findEduPageClass(timetable.classes, [requested]) ??
    findEduPageClass(timetable.classes, [group?.edupageName, group?.name]) ??
    findEduPageClass(timetable.classes, linkedClassNames) ??
    timetable.classes[0] ??
    null;

  const linkedGroup =
    groups.find(
      (item) =>
        normalizeClassName(item.edupageName ?? item.name) ===
        normalizeClassName(selected?.name ?? ""),
    ) ?? null;

  const canManage = user.role === "ADMIN" || user.role === "REGISTRAR";
  const syncState = await readEduPageSyncState();

  const lessons = selected
    ? timetable.lessons.filter((lesson) => lesson.classId === selected.id)
    : [];

  return (
    <>
      <PageHeader
        eyebrow={dictionary.schEduPageEyebrow}
        title={dictionary.schEduPageTitle}
        subtitle={translate(locale, "schEduPageSubtitle", {
          name: selected?.name ?? "ttp u.edupage.org",
        })}
      />
      <EduPageBoard
        className={selected?.name ?? ""}
        classes={timetable.classes}
        groupName={linkedGroup?.name ?? null}
        periods={timetable.periods}
        days={timetable.days}
        lessons={lessons}
        label={timetable.label}
        validity={timetable.validity}
        fetchedAt={timetable.fetchedAt}
        sourceUrl={timetable.sourceUrl}
        canSync={canManage}
        linkOptions={canManage ? groups.map((item) => ({ id: item.id, name: item.name })) : []}
        dbSyncedAt={syncState.at}
        today={tashkentWeekday()}
        refreshMinutes={Math.round(EDUPAGE_REVALIDATE_SECONDS / 60)}
      />
    </>
  );
}
