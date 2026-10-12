import { describe, expect, it, vi, beforeEach } from "vitest";

const { stepMock } = vi.hoisted(() => ({ stepMock: vi.fn() }));

vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai")>();
  return { ...actual, agentChatStep: stepMock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scheduleEntry: { findMany: vi.fn().mockResolvedValue([{ groupId: "g1" }]) },
    studyPlan: { findMany: vi.fn().mockResolvedValue([]) },
    group: { findMany: vi.fn().mockResolvedValue([{ id: "g1", name: "AI-2", year: 2026 }]) },
    user: { groupBy: vi.fn().mockResolvedValue([{ groupId: "g1", _count: { _all: 16 } }]) },
  },
}));

import { runAssistantAgent } from "@/server/assistant/agent";

const teacher = { id: "t1", role: "TEACHER", groupId: null };
const input = {
  user: teacher,
  systemPrompt: "Sen AI yordamchisan.",
  messages: [{ role: "user" as const, content: "Guruhlarimni ayt" }],
};

type ConvoMessage = {
  role: string;
  content: string | null;
  tool_call_id?: string;
};

describe("runAssistantAgent sikl mantiqi", () => {
  beforeEach(() => {
    stepMock.mockReset();
  });

  it("tool kerak bo'lmasa — bitta chaqiruvda javob qaytaradi", async () => {
    stepMock.mockResolvedValueOnce({
      message: { role: "assistant", content: "Salom! Yordam kerakmi?" },
      toolCalls: [],
    });
    const reply = await runAssistantAgent(input);
    expect(reply).toBe("Salom! Yordam kerakmi?");
    expect(stepMock).toHaveBeenCalledTimes(1);
  });

  it("tool chaqiruvini bajaradi va natijani konvoga qo'shib javob beradi", async () => {
    stepMock.mockResolvedValueOnce({
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "call1", type: "function", function: { name: "guruhlarim", arguments: "{}" } }],
      },
      toolCalls: [{ id: "call1", name: "guruhlarim", args: {} }],
    });
    stepMock.mockResolvedValueOnce({
      message: { role: "assistant", content: "AI-2 guruhida 16 talaba bor." },
      toolCalls: [],
    });

    const reply = await runAssistantAgent(input);
    expect(reply).toBe("AI-2 guruhida 16 talaba bor.");
    expect(stepMock).toHaveBeenCalledTimes(2);

    const secondConvo = stepMock.mock.calls[1][0] as ConvoMessage[];
    const toolMessage = secondConvo.find((message) => message.role === "tool");
    expect(toolMessage).toBeTruthy();
    expect(toolMessage?.tool_call_id).toBe("call1");
    expect(toolMessage?.content).toContain("AI-2");
    expect(toolMessage?.content).toContain("16 talaba");
  });

  it("model javob bermasa (null) — null qaytaradi (fallback uchun)", async () => {
    stepMock.mockResolvedValueOnce(null);
    const reply = await runAssistantAgent(input);
    expect(reply).toBeNull();
  });

  it("noma'lum tool so'ralsa — xato matni bilan davom etadi", async () => {
    stepMock.mockResolvedValueOnce({
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "call9", type: "function", function: { name: "yoq_tool", arguments: "{}" } }],
      },
      toolCalls: [{ id: "call9", name: "yoq_tool", args: {} }],
    });
    stepMock.mockResolvedValueOnce({
      message: { role: "assistant", content: "Kechirasiz, buni qila olmayman." },
      toolCalls: [],
    });
    const reply = await runAssistantAgent(input);
    expect(reply).toBe("Kechirasiz, buni qila olmayman.");
    const secondConvo = stepMock.mock.calls[1][0] as ConvoMessage[];
    const toolMessage = secondConvo.find((message) => message.role === "tool");
    expect(toolMessage?.content).toContain("mavjud emas");
  });
});
