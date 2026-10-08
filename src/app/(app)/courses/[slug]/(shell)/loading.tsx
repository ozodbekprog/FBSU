import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export default function CourseTabLoading() {
  return (
    <div className="animate-fade-in space-y-4">
      <Card className="p-5">
        <Bar className="h-5 w-40" />
        <Bar className="mt-3 h-4 w-full max-w-xl" />
        <Bar className="mt-2 h-4 w-2/3 max-w-md" />
      </Card>
      <div className="space-y-3">
        <Card className="p-5">
          <Bar className="h-5 w-32" />
          <Bar className="mt-3 h-4 w-3/4" />
        </Card>
        <Card className="p-5">
          <Bar className="h-5 w-44" />
          <Bar className="mt-3 h-4 w-1/2" />
        </Card>
      </div>
    </div>
  );
}
