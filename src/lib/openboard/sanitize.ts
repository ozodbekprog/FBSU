import sanitize from "sanitize-html";

const ALLOWED_TAGS = [
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
];

const UNSAFE_CSS = /(expression\s*\(|javascript:|vbscript:|@import|behavior\s*:|-moz-binding)/gi;

export function sanitizeHtml(raw: string, options?: { allowStyle?: boolean }): string {
  const allowStyle = options?.allowStyle === true;
  const clean = sanitize(raw, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: { a: ["href"], ...(allowStyle ? { "*": ["style"] } : {}) },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    disallowedTagsMode: "discard",
  });
  if (!allowStyle) return clean;
  return clean.replace(/style="([^"]*)"/gi, (_match, css: string) => `style="${css.replace(UNSAFE_CSS, "")}"`);
}
