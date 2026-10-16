import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button, Card, CardBody, Input, PageHeader, Select } from "@/components/ui";
import UsersManager from "@/components/admin/UsersManager";
import UserBulkBar from "@/components/admin/UserBulkBar";
import { getDictionary, getLocale, t as translate } from "@/i18n";
import { cn } from "@/lib/utils";

const ROLES = ["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR", "TYUTOR", "TEACHER", "STUDENT", "XODIM", "OTA_ONA"] as const;

const PAGE_SIZE = 50;

const PAGE_LINK =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-brand-900";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const admin = await requireRole(["ADMIN", "REGISTRAR"]);
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const role =
    typeof params.role === "string" && ROLES.includes(params.role as (typeof ROLES)[number])
      ? (params.role as (typeof ROLES)[number])
      : "";
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (admin.role === "REGISTRAR") {
    if (role === "STUDENT" || role === "TEACHER") {
      where.role = role;
    } else {
      where.role = { in: ["STUDENT", "TEACHER"] };
    }
  } else if (role) {
    where.role = role;
  }

  const [total, users, groups, departments] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        group: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageParams = new URLSearchParams();
  if (q) pageParams.set("q", q);
  if (role) pageParams.set("role", role);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(pageParams);
    next.set("page", String(target));
    return `/admin/users?${next.toString()}`;
  };

  return (
    <>
      <PageHeader title={dictionary.admUsersTitle} subtitle={translate(locale, "admUsersResults", { count: total })} />

      <form action="/admin/users" method="get" className="mb-4">
        <Card className="overflow-hidden">
          <CardBody className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-600">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <Input name="q" defaultValue={q} placeholder={dictionary.admUsersSearchPlaceholder} className="pl-9" />
            </div>
            <Select name="role" defaultValue={role} className="w-full sm:w-48!">
              <option value="">{dictionary.admUsersAllRoles}</option>
              <option value="STUDENT">{dictionary.admRoleStudent}</option>
              <option value="TEACHER">{dictionary.admRoleTeacher}</option>
              {admin.role === "ADMIN" ? (
                <>
                  <option value="TYUTOR">{dictionary.admRoleTutor}</option>
                  <option value="XODIM">{dictionary.admRoleStaff}</option>
                  <option value="KAFEDRA_MUDIRI">{dictionary.admRoleHead}</option>
                  <option value="DEKAN">{dictionary.admRoleDean}</option>
                  <option value="PRO_RECTOR">{dictionary.admRoleProRector}</option>
                  <option value="REKTOR">{dictionary.admRoleRector}</option>
                  <option value="REGISTRAR">{dictionary.admRoleRegistrar}</option>
                  <option value="ADMIN">{dictionary.admRoleAdmin}</option>
                </>
              ) : null}
            </Select>
            <Button type="submit" variant="secondary" className="gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              {dictionary.admSearch}
            </Button>
            {q || role ? (
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
                {dictionary.admClear}
              </Link>
            ) : null}
            <span className="ml-auto hidden items-center gap-2 text-xs font-medium text-slate-600 sm:inline-flex">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {translate(locale, "admUsersResults", { count: total })}
            </span>
          </CardBody>
        </Card>
      </form>

      <UserBulkBar
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
        }))}
      />

      <UsersManager
        users={users}
        groups={groups}
        departments={departments}
        currentUserId={admin.id}
        allowedRoles={admin.role === "ADMIN" ? null : ["STUDENT", "TEACHER"]}
      />

      {pageCount > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={PAGE_LINK}>
              {dictionary.admPreviousArrow}
            </Link>
          ) : (
            <span className={cn(PAGE_LINK, "pointer-events-none opacity-40")}>{dictionary.admPreviousArrow}</span>
          )}
          <span className="text-sm text-slate-500">
            {translate(locale, "admPagination", { page, pageCount })}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className={PAGE_LINK}>
              {dictionary.admNextArrow}
            </Link>
          ) : (
            <span className={cn(PAGE_LINK, "pointer-events-none opacity-40")}>{dictionary.admNextArrow}</span>
          )}
        </div>
      ) : null}
    </>
  );
}
