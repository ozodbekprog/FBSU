import "server-only";

const API_URL = "https://api.deepseek.com/chat/completions";

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiToolCall = { name: string; args: Record<string, unknown> };

export type AiTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type BugAnalysis = {
  summary: string;
  cause: string;
  fixHint: string;
  severity: string;
};

function sanitizeText(value: string, maxLength: number): string {
  const withoutQuery = value.replace(/https?:\/\/[^\s"'`)]+/g, (url) => {
    const [base] = url.split(/[?#]/);
    return base;
  });
  return withoutQuery.slice(0, maxLength);
}

export async function askAi(
  messages: AiMessage[],
  options?: { timeoutMs?: number; maxTokens?: number },
): Promise<string | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: options?.maxTokens ?? 400,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 20000),
    });
    if (!response.ok) return null;
    const json = (await response.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[] }
      | null;
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch {
    return null;
  }
}

export async function askAiWithTools(
  messages: AiMessage[],
  tools: AiTool[],
  options?: { timeoutMs?: number; maxTokens?: number },
): Promise<{ content: string | null; toolCalls: AiToolCall[] } | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        tools,
        max_tokens: options?.maxTokens ?? 400,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
    });
    if (!response.ok) return null;
    const json = (await response.json().catch(() => null)) as
      | {
          choices?: {
            message?: {
              content?: string | null;
              tool_calls?: { function?: { name?: string; arguments?: string } }[];
            };
          }[];
        }
      | null;
    const message = json?.choices?.[0]?.message;
    const content =
      typeof message?.content === "string" && message.content.trim() ? message.content.trim() : null;
    const toolCalls: AiToolCall[] = Array.isArray(message?.tool_calls)
      ? message.tool_calls
          .map((call) => {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function?.arguments ?? "{}") as Record<string, unknown>;
            } catch {
              args = {};
            }
            return { name: call.function?.name ?? "", args };
          })
          .filter((call) => call.name)
      : [];
    return { content, toolCalls };
  } catch {
    return null;
  }
}

export type AiAgentMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

export type AiAgentToolCall = { id: string; name: string; args: Record<string, unknown> };

/**
 * Agent sikli uchun bitta qadam. `askAiWithTools` dan farqi: tool chaqiruvlari
 * ID si va eski assistant xabari saqlanadi — shu bilan tool natijalarini
 * keyingi qadamda to'g'ri bog'lash mumkin.
 */
export async function agentChatStep(
  messages: AiAgentMessage[],
  tools: AiTool[],
  options?: { timeoutMs?: number; maxTokens?: number },
): Promise<{ message: AiAgentMessage; toolCalls: AiAgentToolCall[] } | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const payload: Record<string, unknown> = {
      model: "deepseek-chat",
      messages,
      max_tokens: options?.maxTokens ?? 600,
      temperature: 0.3,
    };
    if (tools.length > 0) payload.tools = tools;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
    });
    if (!response.ok) return null;
    const json = (await response.json().catch(() => null)) as
      | {
          choices?: {
            message?: {
              content?: string | null;
              tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
            };
          }[];
        }
      | null;
    const raw = json?.choices?.[0]?.message;
    if (!raw) return null;
    const toolCalls: AiAgentToolCall[] = Array.isArray(raw.tool_calls)
      ? raw.tool_calls
          .map((call) => {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function?.arguments ?? "{}") as Record<string, unknown>;
            } catch {
              args = {};
            }
            return { id: call.id ?? "", name: call.function?.name ?? "", args };
          })
          .filter((call) => call.id && call.name)
      : [];
    const content =
      typeof raw.content === "string" && raw.content.trim() ? raw.content.trim() : null;
    const message: AiAgentMessage = { role: "assistant", content };
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.args) },
      }));
    }
    return { message, toolCalls };
  } catch {
    return null;
  }
}

export async function analyzeBug(input: {
  message: string;
  stack?: string | null;
  url?: string | null;
}): Promise<BugAnalysis | null> {
  const reply = await askAi(
    [
      {
        role: "system",
        content:
          "Sen FBSU saytining texnik yordamchisisan. Xatolik haqidagi ma'lumotni tahlil qil va FAQAT JSON qaytar: " +
          '{"summary":"qisqa izoh","cause":"ehtimoliy sabab","fixHint":"tuzatish yo\'l-yo\'riq","severity":"low|medium|high"}. ' +
          "Javob o'zbek tilida va qisqa bo'lsin.",
      },
      {
        role: "user",
        content: `Sahifa: ${sanitizeText(input.url ?? "-", 300)}\nXatolik: ${sanitizeText(input.message, 500)}\nTafsilot: ${sanitizeText(input.stack ?? "", 2500)}`,
      },
    ],
    { maxTokens: 350, timeoutMs: 20000 },
  );
  if (!reply) return null;
  try {
    const start = reply.indexOf("{");
    const end = reply.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(reply.slice(start, end + 1)) as Partial<BugAnalysis>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "Tahlil qilindi",
      cause: typeof parsed.cause === "string" ? parsed.cause : "-",
      fixHint: typeof parsed.fixHint === "string" ? parsed.fixHint : "-",
      severity:
        parsed.severity === "high" || parsed.severity === "low" ? parsed.severity : "medium",
    };
  } catch {
    return null;
  }
}
