import { describe, expect, it } from "vitest";
import { APP_CHANNEL, APP_RELEASED_AT, APP_VERSION, CURRENT_RELEASE, RELEASES } from "./version";

describe("version registry", () => {
  it("current version is the first release", () => {
    expect(RELEASES[0]?.version).toBe(APP_VERSION);
    expect(CURRENT_RELEASE.version).toBe(APP_VERSION);
    expect(CURRENT_RELEASE.channel).toBe(APP_CHANNEL);
    expect(CURRENT_RELEASE.date).toBe(APP_RELEASED_AT);
  });

  it("versions are unique and valid", () => {
    const versions = RELEASES.map((release) => release.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const version of versions) {
      expect(version).toMatch(/^\d+\.\d+\.\d+(-beta\.\d+)?$/);
    }
  });

  it("releases are sorted by date descending", () => {
    const times = RELEASES.map((release) => new Date(release.date).getTime());
    for (const time of times) expect(Number.isFinite(time)).toBe(true);
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it("every release has a title and at least one change", () => {
    for (const release of RELEASES) {
      expect(release.title.length).toBeGreaterThan(0);
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });
});
