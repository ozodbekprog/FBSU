#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const pairs = args
  .filter((arg) => arg.includes("=") && !arg.startsWith("--"))
  .map((arg) => {
    const [source, target] = arg.split("=");
    return { source: source?.trim(), target: target?.trim() };
  });

if (pairs.length === 0 || pairs.some((pair) => !pair.source || !pair.target)) {
  console.error("Ishlatish: node scripts/merge-groups.mjs [--apply] AI-2=AI2-26 [ME-1=ME1-26 ...]");
  process.exit(1);
}

const prisma = new PrismaClient();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = process.env.MERGE_BACKUP_DIR ?? join(tmpdir(), "fbsu-merge-backups");
mkdirSync(backupDir, { recursive: true });

const select = {
  id: true,
  name: true,
  edupageName: true,
  year: true,
  facultyId: true,
  curatorId: true,
  users: { select: { id: true, email: true } },
  subGroups: { select: { id: true, name: true, users: { select: { id: true } } } },
  studyPlans: { select: { id: true, courseId: true } },
};

try {
  for (const pair of pairs) {
    const source = await prisma.group.findUnique({ where: { name: pair.source }, select });
    const target = await prisma.group.findUnique({ where: { name: pair.target }, select });

    if (!source) {
      console.log(`⏭  ${pair.source}: topilmadi, o'tkazildi`);
      continue;
    }
    if (!target) {
      console.log(`⏭  ${pair.source} → ${pair.target}: maqsad guruh topilmadi, o'tkazildi`);
      continue;
    }
    if (source.id === target.id) {
      console.log(`⏭  ${pair.source} → ${pair.target}: bir xil guruh`);
      continue;
    }

    const schedule = await prisma.scheduleEntry.findMany({ where: { groupId: source.id } });
    const snapshot = { at: new Date().toISOString(), source, target, schedule };
    const file = join(backupDir, `merge-${source.name}-into-${target.name}-${stamp}.json`);
    writeFileSync(file, JSON.stringify(snapshot, null, 2));

    console.log(
      `${apply ? "▶" : "…"} ${source.name} → ${target.name}: ` +
        `${source.users.length} user, ${source.subGroups.length} subgroup, ` +
        `${source.studyPlans.length} studyPlan, ${schedule.length} schedule`,
    );

    if (!apply) {
      console.log(`   backup: ${file}`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      for (const subGroup of source.subGroups) {
        const existing = await tx.subGroup.findUnique({
          where: { groupId_name: { groupId: target.id, name: subGroup.name } },
        });
        if (existing) {
          await tx.user.updateMany({
            where: { subGroupId: subGroup.id },
            data: { subGroupId: existing.id },
          });
          await tx.subGroup.delete({ where: { id: subGroup.id } });
        } else {
          await tx.subGroup.update({
            where: { id: subGroup.id },
            data: { groupId: target.id },
          });
        }
      }

      for (const plan of source.studyPlans) {
        await tx.studyPlan.createMany({
          data: [{ groupId: target.id, courseId: plan.courseId }],
          skipDuplicates: true,
        });
      }
      if (source.studyPlans.length > 0) {
        await tx.studyPlan.deleteMany({ where: { id: { in: source.studyPlans.map((p) => p.id) } } });
      }

      await tx.scheduleEntry.deleteMany({ where: { groupId: source.id } });

      await tx.user.updateMany({
        where: { groupId: source.id },
        data: { groupId: target.id },
      });

      if (!target.curatorId && source.curatorId) {
        await tx.group.update({ where: { id: target.id }, data: { curatorId: source.curatorId } });
      }
      if (!target.facultyId && source.facultyId) {
        await tx.group.update({ where: { id: target.id }, data: { facultyId: source.facultyId } });
      }

      await tx.group.delete({ where: { id: source.id } });
    });

    const users = await prisma.user.count({ where: { groupId: target.id } });
    const synced = await prisma.scheduleEntry.count({
      where: { groupId: target.id, source: "edupage" },
    });
    console.log(`   ✅ bajarildi: ${target.name} — ${users} user, ${synced} EduPage dars`);
    console.log(`   backup: ${file}`);
  }
} finally {
  await prisma.$disconnect();
}

if (!apply) console.log("\nDry-run. Yozish uchun --apply qo'shing.");
