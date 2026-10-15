import { describe, expect, it } from "vitest";
import type { InputAnomaly } from "./input-anomaly";
import { KeyboardAnomalyTracker, MouseAnomalyTracker } from "./input-anomaly";

describe("KeyboardAnomalyTracker", () => {
  it("ishonchsiz keydown sintetik klaviatura deb belgilanadi", () => {
    const tracker = new KeyboardAnomalyTracker();
    expect(tracker.key(1000, false)).toEqual({
      type: "AUTOMATION_DETECTED",
      meta: { source: "synthetic-key" },
    });
  });

  it("uniform 40ms intervallar KEY_ANOMALY beradi", () => {
    const tracker = new KeyboardAnomalyTracker();
    let ts = 1000;
    let anomaly = tracker.key(ts, true);
    for (let i = 0; i < 25; i += 1) {
      ts += 40;
      const result = tracker.key(ts, true);
      if (result) anomaly = result;
    }
    expect(anomaly?.type).toBe("KEY_ANOMALY");
    expect(anomaly?.meta.avgMs).toBe(40);
  });

  it("jitter bilan intervallar anomaliya bermaydi", () => {
    const jitter = [120, 180, 90, 220, 140, 260];
    const tracker = new KeyboardAnomalyTracker();
    let ts = 5000;
    tracker.key(ts, true);
    let anomaly: InputAnomaly | null = null;
    for (let i = 0; i < 30; i += 1) {
      ts += jitter[i % jitter.length];
      const result = tracker.key(ts, true);
      if (result) anomaly = result;
    }
    expect(anomaly).toBeNull();
  });

  it("bir xil anomaliya cooldown ichida takrorlanmaydi", () => {
    const tracker = new KeyboardAnomalyTracker(() => 0);
    const emissions: number[] = [];
    let ts = 0;
    for (let i = 0; i < 3000; i += 1) {
      const result = tracker.key(ts, true);
      if (result) emissions.push(ts);
      ts += 40;
    }
    expect(emissions[0]).toBe(800);
    expect(emissions.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < emissions.length; i += 1) {
      expect(emissions[i] - emissions[i - 1]).toBeGreaterThanOrEqual(30_000);
    }
  });
});

describe("MouseAnomalyTracker", () => {
  it("10s ichida 3 ta katta sakrash MOUSE_ANOMALY beradi", () => {
    const tracker = new MouseAnomalyTracker();
    tracker.move(0, 0, 0);
    expect(tracker.move(1200, 0, 10)).toBeNull();
    expect(tracker.move(2400, 0, 20)).toBeNull();
    const anomaly = tracker.move(3600, 0, 30);
    expect(anomaly?.type).toBe("MOUSE_ANOMALY");
    expect(anomaly?.meta.jumps).toBe(3);
  });

  it("oddiy harakat anomaliya bermaydi", () => {
    const tracker = new MouseAnomalyTracker();
    tracker.move(0, 0, 0);
    expect(tracker.move(5, 0, 16)).toBeNull();
    expect(tracker.move(10, 0, 32)).toBeNull();
    expect(tracker.move(15, 0, 48)).toBeNull();
  });

  it("uniform 100ms bosishlar auto-click deb belgilanadi", () => {
    const tracker = new MouseAnomalyTracker();
    let ts = 0;
    let anomaly: InputAnomaly | null = null;
    for (let i = 0; i < 6; i += 1) {
      const result = tracker.click(ts, 0, 0, true);
      if (result) anomaly = result;
      ts += 100;
    }
    expect(anomaly?.type).toBe("MOUSE_ANOMALY");
    expect(anomaly?.meta.pattern).toBe("auto-click");
  });

  it("notekis bosishlar anomaliya bermaydi", () => {
    const gaps = [300, 700, 250, 900, 400];
    const tracker = new MouseAnomalyTracker();
    tracker.click(0, 0, 0, true);
    let ts = 0;
    let anomaly: InputAnomaly | null = null;
    for (const gap of gaps) {
      ts += gap;
      const result = tracker.click(ts, 0, 0, true);
      if (result) anomaly = result;
    }
    expect(anomaly).toBeNull();
  });

  it("ishonchsiz click sintetik sichqoncha deb belgilanadi", () => {
    const tracker = new MouseAnomalyTracker();
    expect(tracker.click(1000, 0, 0, false)).toEqual({
      type: "AUTOMATION_DETECTED",
      meta: { source: "synthetic-click" },
    });
  });
});
