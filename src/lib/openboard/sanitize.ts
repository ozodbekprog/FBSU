import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["b","strong","i","em","u","s","strike","code","kbd","br","div","p","ul","ol","li","h1","h2","h3","blockquote","pre","span","a"] as const;

export function sanitizeHtml(raw: string, options?: { allowStyle?: boolean }): string {
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: options?.allowStyle ? ["href", "style"] : ["href"],
  });
}
