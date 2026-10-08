import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export default function CoursesLoading() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Bar className="h-7 w-40" />
          <Bar className="mt-2 h-4 w-56" />
        </div>
        <Bar className="h-9 w-28 rounded-xl" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="flex items-center gap-3.5 p-4">
            <Bar className="size-11 shrink-0 rounded-xl" />
            <div className="flex-1">
              <Bar className="h-6 w-14" />
              <Bar className="mt-2 h-3 w-24" />
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-3">
        <Bar className="h-11 flex-1 rounded-2xl" />
        <Bar className="h-8 w-24 rounded-full" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="relative h-24 animate-pulse bg-slate-200">
              <div className="absolute left-4 top-3.5 h-6 w-16 animate-pulse rounded-full bg-slate-300/70" />
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="-mt-11 size-11 shrink-0 animate-pulse rounded-full bg-slate-200 ring-4 ring-white" />
                <div className="flex-1">
                  <Bar className="h-4 w-3/4" />
                  <Bar className="mt-2 h-3 w-1/3" />
                </div>
              </div>
              <Bar className="mt-4 h-3 w-full" />
              <Bar className="mt-1.5 h-3 w-2/3" />
              <div className="mt-5 flex gap-2">
                <Bar className="h-6 w-28 rounded-full" />
                <Bar className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
