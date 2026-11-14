import { cleanAiText } from "./ai-core.mjs";

function apiBase() {
  return (process.env.AI_API_BASE ?? "https://api.deepseek.com").replace(/\/+$/, "");
}

function model() {
  return process.env.AI_MODEL ?? "deepseek-chat";
}

function apiKey() {
  return process.env.AI_API_KEY ?? process.env.DEEPSEEK_API_KEY;
}

export function aiConfigured() {
  return Boolean(apiKey());
}

export async function askAi({ system, prompt, maxTokens = 300, temperature = 0.4, timeoutMs = 20000 }) {
  const key = apiKey();
  if (!key) return null;
  try {
    const response = await fetch(`${apiBase()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const json = await response.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    const text = cleanAiText(content ?? "");
    return text || null;
  } catch {
    return null;
  }
}
