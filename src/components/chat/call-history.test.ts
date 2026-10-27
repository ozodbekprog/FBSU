import { describe, expect, it } from "vitest";
import { callMissedTone, callTitleKey, fmtCallDuration, type ChatCall, type Translate } from "./shared";

const base: ChatCall = {
  id: "c1",
  status: "ENDED",
  media: "VIDEO",
  callerId: "me",
  calleeId: "peer",
  durationSec: 12,
};

function call(patch: Partial<ChatCall>): ChatCall {
  return { ...base, ...patch };
}

describe("callTitleKey", () => {
  it("tugagan qo'ng'iroqni yo'nalish va media bo'yicha ajratadi", () => {
    expect(callTitleKey(call({ status: "ENDED", media: "VIDEO" }), true)).toBe("callLogOutgoingVideo");
    expect(callTitleKey(call({ status: "ENDED", media: "AUDIO" }), true)).toBe("callLogOutgoing");
    expect(callTitleKey(call({ status: "ENDED", media: "VIDEO" }), false)).toBe("callLogIncomingVideo");
    expect(callTitleKey(call({ status: "ENDED", media: "AUDIO" }), false)).toBe("callLogIncoming");
  });

  it("javobsiz qo'ng'iroqni chaqiruvchi uchun 'bekor qilindi' deb ko'rsatadi", () => {
    expect(callTitleKey(call({ status: "MISSED", media: "VIDEO" }), true)).toBe("callLogCancelledVideo");
    expect(callTitleKey(call({ status: "MISSED", media: "AUDIO" }), true)).toBe("callLogCancelled");
    expect(callTitleKey(call({ status: "MISSED", media: "VIDEO" }), false)).toBe("callLogMissed");
  });

  it("rad etilgan va jonli holatlarni belgilaydi", () => {
    expect(callTitleKey(call({ status: "DECLINED" }), true)).toBe("callLogDeclined");
    expect(callTitleKey(call({ status: "DECLINED" }), false)).toBe("callLogDeclined");
    expect(callTitleKey(call({ status: "RINGING" }), true)).toBe("callLogRinging");
    expect(callTitleKey(call({ status: "RINGING", media: "AUDIO" }), false)).toBe("callLogIncoming");
    expect(callTitleKey(call({ status: "ACTIVE" }), true)).toBe("callLogActive");
  });
});

describe("callMissedTone", () => {
  it("javobsiz (chaqirilgan uchun) va rad etilganda qizil ohang beradi", () => {
    expect(callMissedTone(call({ status: "MISSED" }), false)).toBe(true);
    expect(callMissedTone(call({ status: "MISSED" }), true)).toBe(false);
    expect(callMissedTone(call({ status: "DECLINED" }), true)).toBe(true);
    expect(callMissedTone(call({ status: "DECLINED" }), false)).toBe(true);
    expect(callMissedTone(call({ status: "ENDED" }), false)).toBe(false);
  });
});

describe("fmtCallDuration", () => {
  const t = ((key: string, params?: Record<string, string | number>) => {
    if (key === "callLogDurSeconds") return `${params?.seconds} s`;
    if (key === "callLogDurMinutes") return `${params?.minutes} daq ${params?.seconds} s`;
    if (key === "callLogDurMinutesOnly") return `${params?.minutes} daq`;
    return key;
  }) as unknown as Translate;

  it("sekund, daqiqa va aniq daqiqalarni formatlaydi", () => {
    expect(fmtCallDuration(8, t)).toBe("8 s");
    expect(fmtCallDuration(59, t)).toBe("59 s");
    expect(fmtCallDuration(65, t)).toBe("1 daq 5 s");
    expect(fmtCallDuration(120, t)).toBe("2 daq");
    expect(fmtCallDuration(3600, t)).toBe("60 daq");
  });
});
