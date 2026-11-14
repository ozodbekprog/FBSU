export const TRAFFIC_VISITOR_COOKIE = "fb_vid";
export const TRAFFIC_SESSION_GAP_MS = 30 * 60 * 1000;
export const TRAFFIC_ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type TrafficHitInput = {
  visitorId: string;
  path: string;
  query: string | null;
  referrer: string | null;
  ip: string;
  userAgent: string | null;
  isRsc: boolean;
  userId: string | null;
  loginId: string | null;
  deviceId: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

export type TrafficKind = "all" | "human" | "bot";
export type TrafficRange = "today" | "7d" | "30d";
