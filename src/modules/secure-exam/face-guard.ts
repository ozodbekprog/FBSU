export type LandmarkPoint = { x: number; y: number };

export type LandmarksLike = {
  getLeftEye: () => LandmarkPoint[];
  getRightEye: () => LandmarkPoint[];
  getNose: () => LandmarkPoint[];
  getMouth: () => LandmarkPoint[];
};

export type FaceMetrics = { yaw: number; ear: number };

export type FaceGuardEventType = "FACE_ABSENT" | "FACE_MULTIPLE" | "LOOK_AWAY" | "FACE_LIVENESS";
export type FaceGuardEvent = { type: FaceGuardEventType; meta: Record<string, string | number | boolean> };

export const FACE_ABSENT_AFTER_MS = 5_000;
export const FACE_MULTIPLE_AFTER_TICKS = 2;
export const LOOK_AWAY_AFTER_MS = 1_800;
export const LOOK_AWAY_YAW_DELTA = 0.28;
export const FACE_EVENT_COOLDOWN_MS = 30_000;
export const LIVENESS_WINDOW_MS = 60_000;

const EAR_FALLBACK = 0.3;
const EAR_BASELINE_MIN = 0.18;
const EAR_BLINK_CAP = 0.2;
const EAR_BLINK_RATIO = 0.72;
const EAR_OPEN_RATIO = 0.85;
const BASELINE_EMA = 0.03;

type FaceGuardStatus = "monitoring" | "absent" | "multi";

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function center(points: LandmarkPoint[]): LandmarkPoint {
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

function eyeAspectRatio(eye: LandmarkPoint[]): number {
  if (eye.length < 6) return EAR_FALLBACK;
  const vertical = distance(eye[1], eye[5]) + distance(eye[2], eye[4]);
  const horizontal = 2 * distance(eye[0], eye[3]);
  return horizontal === 0 ? EAR_FALLBACK : vertical / horizontal;
}

export function faceMetrics(landmarks: LandmarksLike): FaceMetrics {
  const leftEye = center(landmarks.getLeftEye());
  const rightEye = center(landmarks.getRightEye());
  const scale = distance(leftEye, rightEye);
  const ear = (eyeAspectRatio(landmarks.getLeftEye()) + eyeAspectRatio(landmarks.getRightEye())) / 2;
  const nose = landmarks.getNose();
  if (scale === 0 || nose.length === 0) {
    return { yaw: 0, ear };
  }
  const tip = nose[Math.floor(nose.length / 2)];
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  return { yaw: (tip.x - eyeCenterX) / scale, ear };
}

export class FaceGuardTracker {
  private absentSince: number | null = null;
  private absentActive = false;
  private multiTicks = 0;
  private yawBaseline: number | null = null;
  private earBaseline = 0;
  private eyeClosed = false;
  private blinkCount = 0;
  private livenessStart: number | null = null;
  private lookSince: number | null = null;
  private statusState: FaceGuardStatus = "monitoring";
  private readonly cooldowns = new Map<FaceGuardEventType, number>();

  tick(input: { metrics: FaceMetrics[]; ts: number }): FaceGuardEvent[] {
    const events: FaceGuardEvent[] = [];
    const count = input.metrics.length;
    const ts = input.ts;

    if (count === 0) {
      this.multiTicks = 0;
      this.lookSince = null;
      this.livenessStart = null;
      if (this.absentSince === null) this.absentSince = ts;
      if (ts - this.absentSince >= FACE_ABSENT_AFTER_MS) {
        this.absentActive = true;
        this.statusState = "absent";
        if (this.cooldownReady("FACE_ABSENT", ts)) {
          events.push({ type: "FACE_ABSENT", meta: { seconds: Math.round((ts - this.absentSince) / 1000) } });
          this.cooldowns.set("FACE_ABSENT", ts);
          this.absentSince = null;
        }
      } else if (!this.absentActive) {
        this.statusState = "monitoring";
      }
      return events;
    }

    this.absentSince = null;
    this.absentActive = false;

    if (count >= 2) {
      this.multiTicks += 1;
      this.livenessStart = null;
      this.statusState = "multi";
      if (this.multiTicks >= FACE_MULTIPLE_AFTER_TICKS && this.cooldownReady("FACE_MULTIPLE", ts)) {
        events.push({ type: "FACE_MULTIPLE", meta: { count } });
        this.cooldowns.set("FACE_MULTIPLE", ts);
      }
      return events;
    }

    this.multiTicks = 0;
    this.statusState = "monitoring";
    const face = input.metrics[0];

    if (this.yawBaseline === null) {
      this.yawBaseline = face.yaw;
    } else {
      const drift = face.yaw - this.yawBaseline;
      if (Math.abs(drift) <= LOOK_AWAY_YAW_DELTA) {
        this.yawBaseline += drift * BASELINE_EMA;
      }
    }

    const yawDelta = face.yaw - this.yawBaseline;
    if (Math.abs(yawDelta) > LOOK_AWAY_YAW_DELTA) {
      if (this.lookSince === null) this.lookSince = ts;
      if (ts - this.lookSince >= LOOK_AWAY_AFTER_MS && this.cooldownReady("LOOK_AWAY", ts)) {
        events.push({
          type: "LOOK_AWAY",
          meta: { side: yawDelta > 0 ? "right" : "left", seconds: Math.round((ts - this.lookSince) / 1000) },
        });
        this.cooldowns.set("LOOK_AWAY", ts);
      }
    } else {
      this.lookSince = null;
    }

    if (face.ear > EAR_BASELINE_MIN) {
      this.earBaseline =
        this.earBaseline === 0 ? face.ear : this.earBaseline + (face.ear - this.earBaseline) * BASELINE_EMA;
    }
    const blinkThreshold = Math.min(EAR_BLINK_CAP, this.earBaseline * EAR_BLINK_RATIO);
    if (face.ear < blinkThreshold) {
      this.eyeClosed = true;
    } else if (this.eyeClosed && face.ear > this.earBaseline * EAR_OPEN_RATIO) {
      this.blinkCount += 1;
      this.eyeClosed = false;
    }

    if (this.livenessStart === null) this.livenessStart = ts;
    if (ts - this.livenessStart >= LIVENESS_WINDOW_MS) {
      if (this.blinkCount === 0 && this.cooldownReady("FACE_LIVENESS", ts)) {
        events.push({ type: "FACE_LIVENESS", meta: { windowSec: LIVENESS_WINDOW_MS / 1000 } });
        this.cooldowns.set("FACE_LIVENESS", ts);
      }
      this.livenessStart = ts;
      this.blinkCount = 0;
    }

    return events;
  }

  status(): "monitoring" | "absent" | "multi" {
    return this.statusState;
  }

  private cooldownReady(type: FaceGuardEventType, ts: number): boolean {
    const last = this.cooldowns.get(type);
    return last === undefined || ts - last >= FACE_EVENT_COOLDOWN_MS;
  }
}
