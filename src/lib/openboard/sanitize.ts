const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "code",
  "kbd",
  "br",
  "div",
  "p",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "pre",
  "span",
  "a",
]);

const VOID_TAGS = new Set(["br"]);

const TAG_PATTERN =
  /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

const ATTRIBUTE_PATTERN =
  /([a-zA-Z_][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function isSafeHref(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed);
}

function rebuildAnchor(rawAttributes: string): string {
  let href: string | null = null;
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_PATTERN.exec(rawAttributes)) !== null) {
    if (match[1].toLowerCase() !== "href") continue;
    const value = match[2] ?? match[3] ?? match[4];
    if (value !== undefined && isSafeHref(value)) href = value;
    break;
  }
  return href === null ? "<a>" : `<a href="${escapeAttribute(href)}">`;
}

export function sanitizeHtml(raw: string): string {
  const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, "");
  let output = "";
  let lastIndex = 0;
  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(withoutComments)) !== null) {
    output += withoutComments.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;
    const isClosing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (isClosing) {
      if (!VOID_TAGS.has(tag)) output += `</${tag}>`;
      continue;
    }
    output += tag === "a" ? rebuildAnchor(match[3]) : `<${tag}>`;
  }
  output += withoutComments.slice(lastIndex);
  return output;
}
