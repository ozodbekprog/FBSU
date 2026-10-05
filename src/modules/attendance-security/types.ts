export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type QrTokenPayload = {
  sid: string;
  cid: string;
  jti: string;
  iat: number;
  exp: number;
  loc?: GeoPoint;
};

export type RiskReason =
  | "GEO_FAR"
  | "GEO_MISSING"
  | "GEO_ACCURACY_LOW"
  | "IP_CHANGED"
  | "IP_SHARED"
  | "IP_GEO_MISMATCH"
  | "VPN_SUSPECTED"
  | "CODE_USED";

export type RiskResult = {
  suspicious: boolean;
  reasons: RiskReason[];
  distanceM?: number;
  ip?: string | null;
  detail?: Record<string, unknown>;
};

export type IpGeo = {
  ip: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  proxy?: boolean;
  hosting?: boolean;
};

export type CheckInRiskInput = {
  studentId: string;
  sessionId: string;
  courseId: string;
  tokenLocation?: GeoPoint;
  studentLocation?: GeoPoint;
  ip?: string | null;
  usedCode?: boolean;
};
