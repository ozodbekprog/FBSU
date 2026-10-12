import { afterEach, describe, expect, it, vi } from "vitest";

const { RedisConstructor } = vi.hoisted(() => {
  const RedisConstructor = vi.fn(() => ({
    on: vi.fn(),
    status: "wait",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    multi: vi.fn(),
    zremrangebyscore: vi.fn(),
    zadd: vi.fn(),
    zcard: vi.fn(),
    expire: vi.fn(),
    zrange: vi.fn(),
    zrem: vi.fn(),
    del: vi.fn(),
  }));
  return { RedisConstructor };
});

vi.mock("ioredis", () => ({
  default: RedisConstructor,
}));

const originalRedisUrl = process.env.REDIS_URL;

async function loadRateLimit() {
  vi.resetModules();
  return await import("@/lib/rate-limit");
}

describe("rate-limit: REDIS_URL bo'lsa", () => {
  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
    vi.unstubAllEnvs();
    vi.resetModules();
    RedisConstructor.mockClear();
  });

  it("REDIS_URL yo'q bo'lsa Redis client yaratilmaydi, limit memory store bilan sanaladi", async () => {
    delete process.env.REDIS_URL;
    const { checkRateLimit } = await loadRateLimit();

    const config = { windowMs: 60_000, maxAttempts: 3, keyPrefix: "test" };
    const key = `no-redis:${Math.random()}`;

    const r1 = await checkRateLimit(key, config);
    const r2 = await checkRateLimit(key, config);
    const r3 = await checkRateLimit(key, config);
    const r4 = await checkRateLimit(key, config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.totalAttempts).toBe(4);

    expect(RedisConstructor).not.toHaveBeenCalled();
  });

  it("REDIS_URL berilgan bo'lsa Redis client yaratiladi", async () => {
    vi.stubEnv("REDIS_URL", "redis://redis.local:6379");
    const { checkRateLimit } = await loadRateLimit();

    await checkRateLimit(`with-redis:${Math.random()}`, {
      windowMs: 60_000,
      maxAttempts: 3,
      keyPrefix: "test",
    });

    expect(RedisConstructor).toHaveBeenCalledWith(
      "redis://redis.local:6379",
      expect.objectContaining({ lazyConnect: true }),
    );
  });

  it("RATE_LIMIT_REDIS=0 bo'lsa ham Redis client yaratilmaydi", async () => {
    vi.stubEnv("REDIS_URL", "redis://redis.local:6379");
    vi.stubEnv("RATE_LIMIT_REDIS", "0");
    const { checkRateLimit } = await loadRateLimit();

    const result = await checkRateLimit(`redis-disabled:${Math.random()}`, {
      windowMs: 60_000,
      maxAttempts: 3,
      keyPrefix: "test",
    });

    expect(result.allowed).toBe(true);
    expect(RedisConstructor).not.toHaveBeenCalled();
  });
});
