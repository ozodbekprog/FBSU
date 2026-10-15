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

export function sanitizeHtml(raw: string): string {
  return sanitize(raw, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: { a: ["href"] },
  });
}
