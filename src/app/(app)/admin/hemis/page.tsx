import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";

type ExportCard = {
  type: string;
  title: string;
  description: string;
  icon: ReactNode;
};

const EXPORTS: ExportCard[] = [
  {
    type: "students",
    title: "Kontingent",
    description: "Faol talabalar: F.I.O, email, guruh, fakultet va holat.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    type: "teachers",
    title: "O'qituvchilar",
    description: "Professor-o'qituvchilar: F.I.O, email, kafedra va fakultet.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M9 7h7M9 11h5" />
      </svg>
    ),
  },
  {
    type: "grades",
    title: "Baholar",
    description: "Talabalar baholari: test urinishlari va topshiriqlar bo'yicha o'rtacha.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l2 2 4-4" />
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    type: "attendance",
    title: "Davomat",
    description: "Davomat hisoboti: jami darslar, kelganlar soni va foiz.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2.5" />
        <path d="M8 2v4M16 2v4M3 10h18" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
  },
];

export default async function HemisExportPage() {
  await requireRole(["ADMIN", "REGISTRAR"]);

  return (
    <>
      <PageHeader
        title="HEMIS eksport"
        subtitle="Kontingent, o'qituvchilar, baholar va davomat ma'lumotlarini CSV formatda yuklab oling."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {EXPORTS.map((item) => (
          <Card key={item.type} className="flex flex-col">
            <CardHeader
              title={item.title}
              action={
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  {item.icon}
                </span>
              }
            />
            <CardBody className="flex flex-1 flex-col justify-between gap-4">
              <p className="text-sm text-slate-600">{item.description}</p>
              <a
                href={`/api/admin/hemis-export?type=${item.type}`}
                className="inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-800 active:bg-brand-950"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M12 15V3" />
                </svg>
                CSV yuklab olish
              </a>
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        VM 403-son talabi bo&apos;yicha HEMISga topshirish uchun.
      </p>
    </>
  );
}
