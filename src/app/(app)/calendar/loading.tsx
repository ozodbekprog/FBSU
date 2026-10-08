import { Card, Skeleton } from "@/components/ui";

export default function CalendarLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-44" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="ml-auto h-10 w-80 rounded-2xl" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-7 gap-1.5 px-6 py-5">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="min-h-16 rounded-xl sm:min-h-20" />
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="border-b border-slate-100 px-6 py-4">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-3 px-6 py-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          </Card>
          <Card>
            <div className="border-b border-slate-100 px-6 py-4">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-3 px-6 py-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <Skeleton className="h-20 flex-1 rounded-2xl" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
