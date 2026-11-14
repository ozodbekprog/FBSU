import "server-only";
import { prisma } from "@/lib/prisma";
import { classifyUserAgent } from "./ua";
import { TRAFFIC_SESSION_GAP_MS } from "./types";
import type { TrafficHitInput } from "./types";

function viewFields(input: TrafficHitInput) {
  const ua = classifyUserAgent(input.userAgent);
  return {
    visitorId: input.visitorId,
    userId: input.userId,
    path: input.path,
    query: input.query,
    referrer: input.referrer,
    isBot: ua.isBot,
    botName: ua.botName,
    country: input.country,
    city: input.city,
    ip: input.ip,
    browser: ua.browser,
    platform: ua.platform,
    deviceType: ua.deviceType,
    isRsc: input.isRsc,
  };
}

export async function recordTrafficHit(input: TrafficHitInput): Promise<void> {
  const now = new Date();
  const last = await prisma.trafficSession.findFirst({
    where: { visitorId: input.visitorId },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, lastSeenAt: true },
  });

  const sameSession =
    last !== null && now.getTime() - last.lastSeenAt.getTime() < TRAFFIC_SESSION_GAP_MS;

  const ua = classifyUserAgent(input.userAgent);

  if (last && sameSession) {
    const identity = input.userId
      ? { userId: input.userId, loginId: input.loginId, deviceId: input.deviceId }
      : {};
    await prisma.$transaction([
      prisma.trafficSession.update({
        where: { id: last.id },
        data: {
          lastSeenAt: now,
          lastPath: input.path,
          pageCount: { increment: 1 },
          ...identity,
        },
      }),
      prisma.trafficPageView.create({ data: { ...viewFields(input), sessionId: last.id } }),
    ]);
    return;
  }

  await prisma.trafficSession.create({
    data: {
      visitorId: input.visitorId,
      userId: input.userId,
      loginId: input.loginId,
      deviceId: input.deviceId,
      ip: input.ip,
      userAgent: input.userAgent,
      browser: ua.browser,
      platform: ua.platform,
      deviceType: ua.deviceType,
      isBot: ua.isBot,
      botName: ua.botName,
      country: input.country,
      region: input.region,
      city: input.city,
      referrer: input.referrer,
      landingPath: input.path,
      lastPath: input.path,
      pageCount: 1,
      startedAt: now,
      lastSeenAt: now,
      views: { create: viewFields(input) },
    },
  });
}

export async function recordTrafficDwell(
  visitorId: string,
  path: string,
  ms: number,
): Promise<void> {
  const bounded = Math.max(0, Math.min(Math.round(ms), 30 * 60 * 1000));
  if (bounded < 500) return;

  const view = await prisma.trafficPageView.findFirst({
    where: {
      visitorId,
      path,
      durationMs: null,
      createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, sessionId: true },
  });
  if (!view) return;

  await prisma.$transaction([
    prisma.trafficPageView.update({
      where: { id: view.id },
      data: { durationMs: bounded },
    }),
    prisma.trafficSession.update({
      where: { id: view.sessionId },
      data: { lastSeenAt: new Date() },
    }),
  ]);
}

export async function touchTrafficSession(visitorId: string, path: string): Promise<void> {
  const now = new Date();
  const last = await prisma.trafficSession.findFirst({
    where: { visitorId },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, lastSeenAt: true },
  });
  if (!last) return;
  if (now.getTime() - last.lastSeenAt.getTime() > TRAFFIC_SESSION_GAP_MS) return;

  await prisma.trafficSession.update({
    where: { id: last.id },
    data: { lastSeenAt: now, lastPath: path.slice(0, 300) },
  });
}
