export type CodeRunResult = { ok: boolean; lines: string[] };

const MESSAGE_TYPE = "openboard-code-run";
const DEFAULT_TIMEOUT_MS = 3000;
const MATH_SOURCE_LIMIT = 2000;

export function runnableLanguage(lang: string): boolean {
  return lang === "javascript" || lang === "math";
}

type RunMessage = { type: string; lines: string[] };

function isRunMessage(data: unknown): data is RunMessage {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return (
    candidate.type === MESSAGE_TYPE &&
    Array.isArray(candidate.lines) &&
    candidate.lines.every((line) => typeof line === "string")
  );
}

function escapeScriptBody(source: string): string {
  return source
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--");
}

function buildSrcdoc(source: string): string {
  return [
    "<!doctype html><html><body>",
    "<script>",
    "window.__obLines = [];",
    "window.__obError = null;",
    "function __obFmt(args) {",
    "return Array.prototype.map.call(args, function (a) {",
    "if (typeof a === 'string') return a;",
    "try { return JSON.stringify(a); } catch (e) { return String(a); }",
    "}).join(' ');",
    "}",
    "['log', 'warn', 'error'].forEach(function (name) {",
    "console[name] = function () { window.__obLines.push(__obFmt(arguments)); };",
    "});",
    "window.addEventListener('error', function (e) { window.__obError = String(e.message || e.error || 'Error'); });",
    "window.addEventListener('unhandledrejection', function (e) { window.__obError = String(e.reason || 'Unhandled rejection'); });",
    "</script>",
    "<script>",
    escapeScriptBody(source),
    "</script>",
    "<script>",
    "window.setTimeout(function () {",
    "if (window.__obError) window.__obLines.push(window.__obError);",
    `window.parent.postMessage({ type: "${MESSAGE_TYPE}", lines: window.__obLines }, '*');`,
    "}, 10);",
    "</script>",
    "</body></html>",
  ].join("\n");
}

export async function runJavaScript(
  source: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CodeRunResult> {
  if (typeof document === "undefined") {
    return { ok: false, lines: [] };
  }
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("srcdoc", buildSrcdoc(source));
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  return new Promise<CodeRunResult>((resolve) => {
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve({ ok: false, lines: [] });
    }, timeoutMs);
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isRunMessage(event.data)) return;
      cleanup();
      resolve({ ok: true, lines: event.data.lines });
    };
    window.addEventListener("message", onMessage);
  });
}

export async function runMath(source: string): Promise<CodeRunResult> {
  if (source.length > MATH_SOURCE_LIMIT) {
    return { ok: false, lines: ["Source exceeds 2000 characters"] };
  }
  try {
    const math = await import("mathjs");
    const value: unknown = math.evaluate(source);
    return { ok: true, lines: [math.format(value)] };
  } catch (error) {
    return {
      ok: false,
      lines: [error instanceof Error ? error.message : String(error)],
    };
  }
}
