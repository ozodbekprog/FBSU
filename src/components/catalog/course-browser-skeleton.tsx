import { Card, Skeleton } from "@/components/ui";

export function CourseBrowserSkeleton() {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Skeleton className="h-11 min-w-72 flex-1 rounded-2xl" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="h-20 rounded-b-none" />
            <div className="space-y-3 px-6 py-5">
              <div className="flex items-center gap-3">
                <Skeleton className="-mt-11 size-13 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
