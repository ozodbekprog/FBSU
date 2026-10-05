import { Fragment, type ReactNode } from "react";

export function RichText({ text }: { text: string }) {
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(
        <a key={key} href={match[2]} className="font-medium text-brand-700 hover:underline">
          {match[1]}
        </a>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <span key={key} className="font-semibold text-slate-800">
          {match[3]}
        </span>,
      );
    }
    key += 1;
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <Fragment>{nodes}</Fragment>;
}
