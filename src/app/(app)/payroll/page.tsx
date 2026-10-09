import { redirect } from "next/navigation";
import type { Role, SalaryStatus } from "@prisma/client";
import { canManageSalary, canViewSalary, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SALARY_GRANTABLE_ROLES,
  monthKey,
  monthStart,
  salaryTotalsForMonth,
} from "@/lib/payroll";
import { getDictionary, getLocale } from "@/i18n";
import PayrollBoard, { type PayrollInitialData } from "@/components/payroll/payroll-board";

/**
 * Oylik moduli.
 *
 * Ruxsat mantiqi `canViewSalary()` da: BUXGALTER va ADMIN har doim
 * ko'radi, qolgan rollar faqat `SalaryGrant` orqali ruxsat berilgan
 * bo'lsa. Ruxsat yo'q bo'lsa sahifa o'zi ham yuklanmaydi — maxfiy
 * summa brauzerga umuman yetib bor maydi.
 *
 * Ma'lumot to'g'ridan-to'g'ri bazadan olinadi (o'z API'ga so'rov
 * yuborilmaydi), shuning uchun bitta so'rovda hamma tab ma'lumotini
 * yuklaymiz.
 */
export default async function PayrollPage() {
  const user = await requireUser();
  if (!(await canViewSalary(user.role))) redirect("/dashboard");

  const locale = await getLocale();
  const d = getDictionary(locale);

  const month = monthStart(new Date());
  const isManager = canManageSalary(user.role);

  const [records, totals, grants, positions, shifts, employees] = await Promise.all([
    prisma.salaryRecord.findMany({
      where: { month },
      orderBy: [{ status: "asc" }, { total: "desc" }],
      select: {
        id: true,
        month: true,
        baseAmount: true,
        bonusAmount: true,
        total: true,
        status: true,
        note: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            staffPosition: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
    salaryTotalsForMonth(month),
    prisma.salaryGrant.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        canView: true,
        revokedAt: true,
        createdAt: true,
        grantedBy: { select: { name: true } },
      },
    }),
    prisma.staffPosition.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        baseSalary: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.shift.findMany({
      orderBy: [{ isActive: "desc" }, { startMinutes: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        startMinutes: true,
        endMinutes: true,
        isNight: true,
        isActive: true,
        _count: { select: { assignments: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { not: "STUDENT" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        staffPosition: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        shiftAssignments: {
          where: { endsOn: null },
          select: { id: true, weekday: true, shift: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // DRAFT yozuvlar har qanday ko'rish ruxsatida yashiriladi — ular
  // buxgalterning ish jarayonida.
  const visibleRecords = isManager
    ? records
    : records.filter((r) => r.status !== "DRAFT");

  const initial: PayrollInitialData = {
    month: monthKey(month),
    // Server -> client chegara: `Date` obyektlarini satrga o'tkazamiz,
    // aks holda ular client komponentga structured-clone bilan o'tmaydi.
    records: visibleRecords.map((r) => ({
      ...r,
      month: r.month.toISOString(),
    })),
    totals,
    canManage: isManager,
    viewerRole: user.role,
    grantableRoles: [...SALARY_GRANTABLE_ROLES],
    grants: grants.map((g) => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
      revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
    })),
    positions,
    departments,
    shifts,
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      positionName: e.staffPosition?.name ?? null,
      departmentName: e.department?.name ?? null,
      shifts: e.shiftAssignments,
    })),
    weekdays: d.payWeekdayList.split("|"),
  };

  return (
    <PayrollBoard
      initial={initial}
      dictionary={{
        title: d.payTitle,
        subtitle: d.paySubtitle,
        viewOnly: d.payViewOnly,
        tabRecords: d.payTabRecords,
        tabPositions: d.payTabPositions,
        tabShifts: d.payTabShifts,
        tabSchedule: d.payTabSchedule,
        tabGrants: d.payTabGrants,
        month: d.payMonth,
        employee: d.payEmployee,
        position: d.payPosition,
        department: d.payDepartment,
        base: d.payBase,
        bonus: d.payBonus,
        total: d.payTotal,
        status: d.payStatus,
        addRecord: d.payAddRecord,
        editRecord: d.payEditRecord,
        empty: d.payEmpty,
        draft: d.payDraft,
        pending: d.payPending,
        approved: d.payApproved,
        paid: d.payPaid,
        approve: d.payApprove,
        markPaid: d.payMarkPaid,
        sendPending: d.paySendPending,
        note: d.payNote,
        notePh: d.payNotePh,
        summaryTitle: d.paySummaryTitle,
        summarySubtitle: d.paySummarySubtitle,
        grandTotal: d.payGrandTotal,
        unassigned: d.payUnassigned,
        staffCount: d.payStaffCount,
        noGroupData: d.payNoGroupData,
        positionsTitle: d.payPositionsTitle,
        positionsSubtitle: d.payPositionsSubtitle,
        addPosition: d.payAddPosition,
        baseSalary: d.payBaseSalary,
        positionName: d.payPositionName,
        positionPh: d.payPositionPh,
        code: d.payCode,
        codePh: d.payCodePh,
        assigned: d.payAssigned,
        noPositions: d.payNoPositions,
        shiftsTitle: d.payShiftsTitle,
        shiftsSubtitle: d.payShiftsSubtitle,
        addShift: d.payAddShift,
        shiftName: d.payShiftName,
        shiftNamePh: d.payShiftNamePh,
        shiftStart: d.payShiftStart,
        shiftEnd: d.payShiftEnd,
        shiftNight: d.payShiftNight,
        shiftDuration: d.payShiftDuration,
        noShifts: d.payNoShifts,
        shiftUsed: d.payShiftUsed,
        scheduleTitle: d.payScheduleTitle,
        scheduleSubtitle: d.payScheduleSubtitle,
        assignShift: d.payAssignShift,
        weekday: d.payWeekday,
        shift: d.payShift,
        pickEmployee: d.pickEmployee,
        pickShift: d.pickShift,
        noAssignments: d.payNoAssignments,
        clearShift: d.payClearShift,
        grantsTitle: d.payGrantsTitle,
        grantsSubtitle: d.payGrantsSubtitle,
        grantRole: d.payGrantRole,
        grantActive: d.payGrantActive,
        grantRevoked: d.payGrantRevoked,
        grantBtn: d.payGrantBtn,
        revokeBtn: d.payRevokeBtn,
        noGrants: d.payNoGrants,
        alwaysSee: d.payAlwaysSee,
        grantedBy: d.payGrantedBy,
        saveError: d.paySaveError,
        amountError: d.payAmountError,
        payCancel: d.payCancel,
        editShort: d.payEditShort,
        payDelete: d.payDelete,
        deleteHint: d.payDeleteHint,
        roleBuxgalter: d.payRoleBuxgalter,
        roleXodim: d.payRoleXodim,
        roleTyutor: d.payRoleTyutor,
        roleHead: d.payRoleHead,
        roleDean: d.payRoleDean,
        roleProRector: d.payRoleProRector,
        roleRector: d.payRoleRector,
        roleAdmin: d.payRoleAdmin,
        roleRegistrar: d.payRoleRegistrar,
        roleTeacher: d.payRoleTeacher,
        roleStudent: d.payRoleStudent,
        roleParent: d.payRoleParent,
      }}
    />
  );
}