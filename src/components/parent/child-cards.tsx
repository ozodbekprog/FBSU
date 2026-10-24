import Link from "next/link";
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
    <div className="fb-childswitch">
      <span>{label}</span>
      {links.map((link) => {
        const active = link.student.id === selectedId;
        return (
          <Link
            key={link.id}
            href={`/parent?student=${link.student.id}`}
            className={cn("fb-childpill", active && "active")}
          >
            {link.student.name}
            {link.student.group ? <small>{link.student.group.name}</small> : null}
          </Link>
        );
      })}
    </div>
  );
}
