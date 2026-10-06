import { requireUser } from "@/lib/auth";
import { getDictionary, getLocale } from "@/i18n";
import { PageHeader } from "@/components/ui";
import { PendulumSim } from "@/components/labs/pendulum-sim";
import { ProjectileSim } from "@/components/labs/projectile-sim";
import { FunctionGraph } from "@/components/labs/function-graph";
import { GravitySandbox } from "@/components/labs/gravity-sandbox";

export default async function LabsPage() {
  await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  return (
    <>
      <PageHeader title={dictionary.labTitle} subtitle={dictionary.labSubtitle} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PendulumSim />
        <ProjectileSim />
        <FunctionGraph />
        <GravitySandbox />
      </div>
    </>
  );
}
