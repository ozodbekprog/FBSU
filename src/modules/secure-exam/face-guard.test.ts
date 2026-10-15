import { describe, expect, it } from "vitest";
import { FACE_EVENT_COOLDOWN_MS, FaceGuardTracker, faceMetrics } from "./face-guard";
import type { LandmarkPoint, LandmarksLike } from "./face-guard";

function eye(cx: number, cy: number, open: boolean): LandmarkPoint[] {
  const spread = open ? 5 : 0.5;
  return [
    { x: cx - 10, y: cy },
    { x: cx - 5, y: cy - spread },
    { x: cx + 5, y: cy - spread },
    { x: cx + 10, y: cy },
    { x: cx + 5, y: cy + spread },
    { x: cx - 5, y: cy + spread },
  ];
}

function createLandmarks(options: {
  leftEyeX: number;
  rightEyeX: number;
  eyeY: number;
  noseX: number;
  eyesOpen: boolean;
}): LandmarksLike {
  const leftEye = eye(options.leftEyeX, options.eyeY, options.eyesOpen);
  const rightEye = eye(options.rightEyeX, options.eyeY, options.eyesOpen);
  const nose: LandmarkPoint[] = [0, 1, 2, 3, 4].map((step) => ({
    x: options.noseX,
    y: options.eyeY + 18 + step * 2,
  }));
  const mouth: LandmarkPoint[] = [0, 1, 2, 3, 4, 5, 6].map((step) => ({
    x: options.leftEyeX + step * 5,
    y: options.eyeY + 40,
  }));
  return {
    getLeftEye: () => leftEye,
    getRightEye: () => rightEye,
    getNose: () => nose,
    getMouth: () => mouth,
  };
}

function face(yaw: number, ear = 0.3) {
  return { yaw, ear };
}

describe("faceMetrics", () => {
  it("simmetrik yuzda yaw nolga yaqin", () => {
    const metrics = faceMetrics(
      createLandmarks({ leftEyeX: 100, rightEyeX: 200, eyeY: 100, noseX: 150, eyesOpen: true }),
    );
    expect(Math.abs(metrics.yaw)).toBeLessThan(0.02);
  });

  it("burun o'ngga surilsa yaw musbat", () => {
    const metrics = faceMetrics(
      createLandmarks({ leftEyeX: 100, rightEyeX: 200, eyeY: 100, noseX: 170, eyesOpen: true }),
    );
    expect(metrics.yaw).toBeGreaterThan(0);
  });

  it("yopiq ko'zlar uchun ear kichik, ochiq ko'zlar uchun katta", () => {
    const closed = faceMetrics(
      createLandmarks({ leftEyeX: 100, rightEyeX: 200, eyeY: 100, noseX: 150, eyesOpen: false }),
    );
    const open = faceMetrics(
      createLandmarks({ leftEyeX: 100, rightEyeX: 200, eyeY: 100, noseX: 150, eyesOpen: true }),
    );
    expect(closed.ear).toBeLessThan(0.2);
    expect(open.ear).toBeGreaterThan(0.2);
  });
});

describe("FaceGuardTracker: absent", () => {
  it("5s bo'sh kadr bitta FACE_ABSENT chiqaradi, keyingisi chiqmaydi", () => {
    const tracker = new FaceGuardTracker();
    expect(tracker.tick({ metrics: [], ts: 0 })).toEqual([]);
    const events = tracker.tick({ metrics: [], ts: 5000 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("FACE_ABSENT");
    expect(events[0].meta.seconds).toBe(5);
    expect(tracker.tick({ metrics: [], ts: 5100 })).toEqual([]);
  });
});

describe("FaceGuardTracker: multiple", () => {
  it("2 yuz 2 tickdan keyin bitta FACE_MULTIPLE chiqaradi", () => {
    const tracker = new FaceGuardTracker();
    const metrics = [face(0), face(0.1, 0.25)];
    expect(tracker.tick({ metrics, ts: 0 })).toEqual([]);
    const events = tracker.tick({ metrics, ts: 100 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("FACE_MULTIPLE");
    expect(events[0].meta.count).toBe(2);
    expect(tracker.tick({ metrics, ts: 200 })).toEqual([]);
  });
});

describe("FaceGuardTracker: look away", () => {
  it("barqaror baseline buzilganda 1.8s dan keyin LOOK_AWAY beradi", () => {
    const tracker = new FaceGuardTracker();
    for (let index = 0; index < 5; index += 1) {
      expect(tracker.tick({ metrics: [face(0.1)], ts: index * 100 })).toEqual([]);
    }
    expect(tracker.status()).toBe("monitoring");
    tracker.tick({ metrics: [face(0.5)], ts: 1000 });
    const events = tracker.tick({ metrics: [face(0.5)], ts: 2800 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("LOOK_AWAY");
    expect(events[0].meta.side).toBe("right");
    expect(events[0].meta.seconds).toBe(2);

    tracker.tick({ metrics: [face(0.1)], ts: 2900 });
    const far = 2900 + FACE_EVENT_COOLDOWN_MS;
    tracker.tick({ metrics: [face(0.1)], ts: far });
    tracker.tick({ metrics: [face(0.5)], ts: far + 100 });
    const again = tracker.tick({ metrics: [face(0.5)], ts: far + 1900 });
    expect(again).toHaveLength(1);
    expect(again[0].type).toBe("LOOK_AWAY");
  });

  it("cooldown ichida ikkinchi qarash chiqmaydi", () => {
    const tracker = new FaceGuardTracker();
    tracker.tick({ metrics: [face(0.1)], ts: 0 });
    tracker.tick({ metrics: [face(0.5)], ts: 1000 });
    const first = tracker.tick({ metrics: [face(0.5)], ts: 2800 });
    expect(first).toHaveLength(1);
    tracker.tick({ metrics: [face(0.1)], ts: 3000 });
    tracker.tick({ metrics: [face(0.5)], ts: 5000 });
    expect(tracker.tick({ metrics: [face(0.5)], ts: 6800 })).toEqual([]);
  });
});

describe("FaceGuardTracker: status", () => {
  it("kadr soni bo'yicha holat qaytaradi", () => {
    const tracker = new FaceGuardTracker();
    tracker.tick({ metrics: [], ts: 0 });
    expect(tracker.status()).toBe("monitoring");
    tracker.tick({ metrics: [], ts: 5000 });
    expect(tracker.status()).toBe("absent");
    tracker.tick({ metrics: [face(0), face(0.1, 0.25)], ts: 5100 });
    expect(tracker.status()).toBe("multi");
    tracker.tick({ metrics: [face(0)], ts: 5200 });
    expect(tracker.status()).toBe("monitoring");
  });
});

describe("FaceGuardTracker: liveness", () => {
  it("60s blink bo'lmasa bitta FACE_LIVENESS chiqaradi", () => {
    const tracker = new FaceGuardTracker();
    expect(tracker.tick({ metrics: [face(0.1)], ts: 0 })).toEqual([]);
    for (let ts = 1000; ts < 60000; ts += 1000) {
      expect(tracker.tick({ metrics: [face(0.1)], ts })).toEqual([]);
    }
    const events = tracker.tick({ metrics: [face(0.1)], ts: 60000 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("FACE_LIVENESS");
    expect(events[0].meta.windowSec).toBe(60);
    expect(tracker.tick({ metrics: [face(0.1)], ts: 61000 })).toEqual([]);
  });

  it("blink bo'lsa FACE_LIVENESS chiqmaydi", () => {
    const tracker = new FaceGuardTracker();
    tracker.tick({ metrics: [face(0.1)], ts: 0 });
    tracker.tick({ metrics: [face(0.1, 0.05)], ts: 1000 });
    tracker.tick({ metrics: [face(0.1)], ts: 1100 });
    const events = tracker.tick({ metrics: [face(0.1)], ts: 60000 });
    expect(events.some((event) => event.type === "FACE_LIVENESS")).toBe(false);
  });
});
