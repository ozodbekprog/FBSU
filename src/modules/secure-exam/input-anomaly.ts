export type InputAnomalyType = "KEY_ANOMALY" | "MOUSE_ANOMALY" | "AUTOMATION_DETECTED";

export type InputAnomaly = {
  type: InputAnomalyType;
  meta: Record<string, string | number | boolean>;
};

export const ANOMALY_COOLDOWN_MS = 30_000;
export const KEY_WINDOW_SIZE = 25;
export const KEY_MIN_AVG_MS = 55;
export const KEY_MAX_CV = 0.08;
export const KEY_MIN_SAMPLES = 20;
export const MOUSE_JUMP_PX = 700;
export const MOUSE_JUMP_MS = 16;
export const MOUSE_JUMP_LIMIT = 3;
export const MOUSE_JUMP_WINDOW_MS = 10_000;
export const CLICK_WINDOW_SIZE = 6;
export const CLICK_MAX_MEAN_MS = 400;
export const CLICK_MAX_CV = 0.12;

function meanOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function stdevOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = meanOf(values);
  let sum = 0;
  for (const value of values) {
    const diff = value - mean;
    sum += diff * diff;
  }
  return Math.sqrt(sum / values.length);
}

function coefficientOfVariation(values: readonly number[]): number {
  const mean = meanOf(values);
  if (mean <= 0) return Number.POSITIVE_INFINITY;
  return stdevOf(values) / mean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pushCapped(target: number[], value: number, cap: number): void {
  target.push(value);
  if (target.length > cap) target.shift();
}

class AnomalyEmitter {
  private readonly clock: () => number;
  private readonly lastEmit = new Map<InputAnomalyType, number>();

  constructor(clock: () => number) {
    this.clock = clock;
  }

  protected resolveNow(timestamp: number): number {
    return Number.isFinite(timestamp) ? timestamp : this.clock();
  }

  protected emit(
    type: InputAnomalyType,
    meta: Record<string, string | number | boolean>,
    now: number,
  ): InputAnomaly | null {
    const last = this.lastEmit.get(type);
    if (last !== undefined && now - last < ANOMALY_COOLDOWN_MS) return null;
    this.lastEmit.set(type, now);
    return { type, meta };
  }
}

export class KeyboardAnomalyTracker extends AnomalyEmitter {
  private intervals: number[] = [];
  private lastKeyTs: number | null = null;

  constructor(clock: () => number = () => Date.now()) {
    super(clock);
  }

  key(timestamp: number, trusted: boolean): InputAnomaly | null {
    const now = this.resolveNow(timestamp);

    if (!trusted) {
      this.lastKeyTs = null;
      return this.emit("AUTOMATION_DETECTED", { source: "synthetic-key" }, now);
    }

    if (this.lastKeyTs !== null) {
      pushCapped(this.intervals, timestamp - this.lastKeyTs, KEY_WINDOW_SIZE);
    }
    this.lastKeyTs = timestamp;

    return this.evaluate(now);
  }

  private evaluate(now: number): InputAnomaly | null {
    if (this.intervals.length < KEY_MIN_SAMPLES) return null;

    const mean = meanOf(this.intervals);
    let meta: Record<string, string | number | boolean>;

    if (mean < KEY_MIN_AVG_MS) {
      meta = { avgMs: Math.round(mean) };
    } else {
      const cv = coefficientOfVariation(this.intervals);
      if (cv >= KEY_MAX_CV) return null;
      meta = { cv: round2(cv) };
    }

    this.intervals = [];
    this.lastKeyTs = null;
    return this.emit("KEY_ANOMALY", meta, now);
  }
}

export class MouseAnomalyTracker extends AnomalyEmitter {
  private prev: { x: number; y: number; t: number } | null = null;
  private jumps: number[] = [];
  private clickTimes: number[] = [];

  constructor(clock: () => number = () => Date.now()) {
    super(clock);
  }

  move(x: number, y: number, timestamp: number): InputAnomaly | null {
    const now = this.resolveNow(timestamp);

    if (this.prev) {
      const distance = Math.hypot(x - this.prev.x, y - this.prev.y);
      const dt = timestamp - this.prev.t;

      if (distance > MOUSE_JUMP_PX && dt <= MOUSE_JUMP_MS) {
        this.jumps.push(timestamp);
        this.jumps = this.jumps.filter((t) => timestamp - t <= MOUSE_JUMP_WINDOW_MS);

        if (this.jumps.length >= MOUSE_JUMP_LIMIT) {
          const jumps = this.jumps.length;
          this.jumps = [];
          this.prev = { x, y, t: timestamp };
          return this.emit("MOUSE_ANOMALY", { jumps }, now);
        }
      }
    }

    this.prev = { x, y, t: timestamp };
    return null;
  }

  click(timestamp: number, x: number, y: number, trusted: boolean): InputAnomaly | null {
    const now = this.resolveNow(timestamp);

    if (!trusted) {
      return this.emit("AUTOMATION_DETECTED", { source: "synthetic-click" }, now);
    }

    pushCapped(this.clickTimes, timestamp, CLICK_WINDOW_SIZE);
    if (this.clickTimes.length < CLICK_WINDOW_SIZE) return null;

    const intervals: number[] = [];
    for (let i = 1; i < this.clickTimes.length; i += 1) {
      intervals.push(this.clickTimes[i] - this.clickTimes[i - 1]);
    }

    const mean = meanOf(intervals);
    if (mean >= CLICK_MAX_MEAN_MS) return null;

    const cv = coefficientOfVariation(intervals);
    if (cv >= CLICK_MAX_CV) return null;

    this.clickTimes = [];
    return this.emit("MOUSE_ANOMALY", { pattern: "auto-click" }, now);
  }
}
