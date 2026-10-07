import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, getClientInfo } from "@/lib/audit";
import { safeUploadContentType, uploadsRoot } from "@/lib/uploads";

function isSafePath(baseDir: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const clientInfo = getClientInfo(request);
  const user = await getCurrentUser();
  if (!user) {
    await createAuditLog({
      action: "FILE_DOWNLOAD",
      meta: { reason: "unauthorized" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return new Response("Unauthorized", { status: 401 });
  }

  const { path: segments } = await params;
  if (
    !segments?.length ||
    segments.some((segment) => segment === ".." || segment.includes("/") || segment.includes("\\"))
  ) {
    return new Response("Not found", { status: 404 });
  }

  const baseDir = uploadsRoot();
  const requestedPath = path.join(baseDir, ...segments);

  if (!isSafePath(baseDir, requestedPath)) {
    await createAuditLog({
      action: "FILE_DOWNLOAD",
      entity: "File",
      meta: { requestedPath: segments.join("/"), reason: "path_traversal_attempt" },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return new Response("Not found", { status: 404 });
  }

  const subdir = segments.length > 1 ? segments[0] : null;
  const lastSegment = segments[segments.length - 1];

  if (subdir === "submissions") {
    const submission = await prisma.submission.findFirst({
      where: { fileUrl: { endsWith: `/${lastSegment}` } },
      select: {
        studentId: true,
        assignment: { select: { course: { select: { teacherId: true } } } },
      },
    });
    const allowed =
      user.role === "ADMIN" ||
      (submission !== null &&
        (submission.studentId === user.id ||
          submission.assignment.course.teacherId === user.id));
    if (!allowed) {
      await createAuditLog({
        action: "FILE_DOWNLOAD",
        entity: "File",
        entityId: lastSegment,
        meta: { subdir: "submissions", reason: "forbidden" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return new Response("Forbidden", { status: 403 });
    }
  } else if (subdir !== null && subdir !== "avatars" && subdir !== "covers") {
    if (user.role !== "ADMIN") {
      await createAuditLog({
        action: "FILE_DOWNLOAD",
        entity: "File",
        entityId: lastSegment,
        meta: { subdir, reason: "forbidden_folder" },
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      });
      return new Response("Forbidden", { status: 403 });
    }
  }

  try {
    const info = await stat(requestedPath);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const data = await readFile(requestedPath);
    const extension = requestedPath.split(".").pop()?.toLowerCase() ?? "";
    const fileName = segments[segments.length - 1];
    await createAuditLog({
      action: "FILE_DOWNLOAD",
      entity: "File",
      entityId: fileName,
      meta: { extension, size: info.size, downloadedBy: user.id },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": safeUploadContentType(requestedPath),
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}