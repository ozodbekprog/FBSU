import Link from "next/link";
import { Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";

type ParentChild = {
  id: string;
  student: {
    id: string;
    name: string;
    group: { name: string } | null;
  };
};

export function ChildCards({
  links,
  selectedId,
  label,
}: {
  links: ParentChild[];
  selectedId: string;
  label: string;
}) {
  if (links.length < 2) return null;

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-500">{label}</span>
        {links.map((link) => {
          const active = link.student.id === selectedId;
          return (
            <Link
              key={link.id}
              href={`/parent?student=${link.student.id}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand-900 bg-brand-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
              )}
            >
              {link.student.name}
              {link.student.group ? (
                <span
                  className={cn(
                    "text-xs font-normal",
                    active ? "text-white/70" : "text-slate-500",
                  )}
                >
                  {link.student.group.name}
                </span>
              ) : null}
            </Link>
          );
        })}
      </CardBody>
    </Card>
  );
}
