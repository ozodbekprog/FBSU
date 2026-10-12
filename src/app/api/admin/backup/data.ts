import { prisma } from "@/lib/prisma";

/**
 * Zaxira eksporti uchun asosiy jadvallar.
 *
 * XAVFSIZLIK: select bilan maydonlarni qat'iysha cheklangan —
 * `passwordHash`, `sessionEpoch`, `faceDescriptor` kabi sezgir
 * maydonlar hech qachon eksportga tushmaydi.
 */
const USERS_SELECT = {
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    avatarUrl: true,
    coverUrl: true,
    bio: true,
    preferences: true,
    isActive: true,
    lastSeenAt: true,
    createdAt: true,
    groupId: true,
    subGroupId: true,
    facultyId: true,
    departmentId: true,
  },
} as const;

export type BackupCounts = Record<string, number>;

export type BackupSnapshot = {
  exportedAt: string;
  counts: BackupCounts;
  data: {
    users: unknown[];
    groups: unknown[];
    faculties: unknown[];
    departments: unknown[];
    subjects: unknown[];
    courses: unknown[];
    contracts: unknown[];
    payments: unknown[];
  };
};

export async function getBackupSnapshot(): Promise<BackupSnapshot> {
  const [users, groups, faculties, departments, subjects, courses, contracts, payments] =
    await Promise.all([
      prisma.user.findMany(USERS_SELECT),
      prisma.group.findMany(),
      prisma.faculty.findMany(),
      prisma.department.findMany(),
      prisma.subject.findMany(),
      prisma.course.findMany(),
      prisma.contract.findMany(),
      prisma.payment.findMany(),
    ]);

  const data = {
    users,
    groups,
    faculties,
    departments,
    subjects,
    courses,
    contracts,
    payments,
  };

  const counts: BackupCounts = {
    users: users.length,
    groups: groups.length,
    faculties: faculties.length,
    departments: departments.length,
    subjects: subjects.length,
    courses: courses.length,
    contracts: contracts.length,
    payments: payments.length,
  };

  return {
    exportedAt: new Date().toISOString(),
    counts,
    data,
  };
}

export async function getBackupCounts(): Promise<BackupCounts> {
  const [users, groups, faculties, departments, subjects, courses, contracts, payments] =
    await Promise.all([
      prisma.user.count(),
      prisma.group.count(),
      prisma.faculty.count(),
      prisma.department.count(),
      prisma.subject.count(),
      prisma.course.count(),
      prisma.contract.count(),
      prisma.payment.count(),
    ]);

  return {
    users,
    groups,
    faculties,
    departments,
    subjects,
    courses,
    contracts,
    payments,
  };
}
