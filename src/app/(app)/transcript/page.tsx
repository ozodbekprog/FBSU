import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isRegistrar, isStaff, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { buildTranscript } from "@/components/transcript/transcript-data";
import { TranscriptDocument } from "@/components/transcript/transcript-document";
import { TranscriptPrintButton } from "@/components/transcript/print-button";
import { Button, Card, CardBody, CardHeader, Label, PageHeader, Select } from "@/components/ui";

const PRINT_STYLES = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  body * { visibility: hidden !important; }
  #ttpu-transcript, #ttpu-transcript * { visibility: visible !important; }
  #ttpu-transcript {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 10mm;
    background: #ffffff;
  }
  #ttpu-transcript .transcript-sheet {
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  #ttpu-transcript .transcript-sheet * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    box-shadow: none !important;
  }
  #ttpu-transcript thead { display: table-header-group; }
  #ttpu-transcript tr { break-inside: avoid; }
}
`;

type StudentOption = { id: string; name: string; group: { name: string } | null };

function groupStudents(students: StudentOption[], noGroupLabel: string) {
  const grouped = new Map<string, StudentOption[]>();
  for (const student of students) {
    const key = student.group?.name ?? noGroupLabel;
    const list = grouped.get(key);
    if (list) list.push(student);
    else grouped.set(key, [student]);
  }
  return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function StudentPicker({
  students,
  selectedId,
}: {
  students: StudentOption[];
  selectedId?: string;
}) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const groups = groupStudents(students, dictionary.grdNoGroup);

  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-96">
        <Label>{dictionary.grdStudent}</Label>
        <Select
          key={selectedId ?? "none"}
          name="studentId"
          defaultValue={selectedId ?? ""}
          required
        >
          <option value="" disabled>
            {dictionary.grdSelectStudent}
          </option>
          {groups.map(([groupName, list]) => (
            <optgroup
              key={groupName}
              label={translate(locale, "grdGroupOption", {
                group: groupName,
                count: list.length,
              })}
            >
              {list.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" className="w-full sm:w-auto">
        {dictionary.grdShow}
      </Button>
    </form>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return { title: dictionary.grdTranscriptTitle };
}

export default async function TranscriptPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();
  const staff = isStaff(user.role) || isRegistrar(user.role);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const { studentId } = await searchParams;

  if (!staff && studentId && studentId !== user.id) notFound();

  const targetId = staff && studentId ? studentId : user.id;

  let scopedCourseIds: string[] | undefined;
  if (user.role === "TEACHER" && studentId && studentId !== user.id) {
    const ownedCourses = await prisma.course.findMany({
      where: {
        teacherId: user.id,
        enrollments: { some: { userId: studentId, status: "ACTIVE" } },
      },
      select: { id: true },
    });
    if (ownedCourses.length === 0) notFound();
    scopedCourseIds = ownedCourses.map((course) => course.id);
  }

  const studentsPromise: Promise<StudentOption[]> = staff
    ? prisma.user.findMany({
        where: { role: "STUDENT", isActive: true },
        select: { id: true, name: true, group: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: 500,
      })
    : Promise.resolve([]);

  const [data, students] = await Promise.all([
    buildTranscript(targetId, scopedCourseIds),
    studentsPromise,
  ]);

  if (!data) {
    if (!staff) notFound();
    return (
      <>
        <PageHeader
          title={dictionary.grdTranscriptTitle}
          subtitle={dictionary.grdSelectStudent}
          eyebrow={dictionary.grdOfficialDocument}
        />
        <Card>
          <CardHeader
            title={dictionary.grdSelectStudentTitle}
            subtitle={translate(locale, "grdActiveStudents", { count: students.length })}
          />
          <CardBody>
            <StudentPicker students={students} selectedId={studentId} />
            {studentId ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {dictionary.grdStudentNotFound}
              </p>
            ) : (
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {dictionary.grdSelectStudentHint}
              </p>
            )}
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <style>{PRINT_STYLES}</style>

      <div className="print:hidden">
        <PageHeader
          title={dictionary.grdTranscriptTitle}
          subtitle={`${data.student.name}${
            data.student.group ? ` · ${data.student.group}` : ""
          }`}
          eyebrow={dictionary.grdOfficialDocument}
          action={<TranscriptPrintButton />}
        />

        {staff ? (
          <Card className="mb-6">
            <CardHeader
              title={dictionary.grdSelectStudentTitle}
              subtitle={translate(locale, "grdActiveStudentsNow", {
                count: students.length,
                name: data.student.name,
              })}
            />
            <CardBody>
              <StudentPicker students={students} selectedId={data.student.id} />
            </CardBody>
          </Card>
        ) : null}
      </div>

      <TranscriptDocument data={data} />
    </>
  );
}
