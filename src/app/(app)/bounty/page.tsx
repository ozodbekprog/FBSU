import { requireUser } from "@/lib/auth";
import { getDictionary, getLocale, type Dictionary } from "@/i18n";
import BountyView from "@/components/bounty/bounty-view";
import { parseBountyFilter } from "@/lib/bug-bounty";

const ROLE_EYEBROW: Record<string, keyof Dictionary> = {
  ADMIN: "admEyebrowAdmin",
  REKTOR: "admRoleRector",
  PRO_RECTOR: "admRoleProRector",
  DEKAN: "admRoleDean",
  KAFEDRA_MUDIRI: "admRoleHead",
  REGISTRAR: "admRoleRegistrar",
  BUXGALTER: "admRoleBuxgalter",
  TYUTOR: "admRoleTutor",
  XODIM: "admRoleStaff",
  TEACHER: "admRoleTeacher",
  STUDENT: "admRoleStudent",
  OTA_ONA: "admRoleParent",
};

export default async function BountyPage({
  searchParams,
}: {
  searchParams: Promise<{ holat?: string }>;
}) {
  const user = await requireUser();
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const params = await searchParams;
  const eyebrowKey = ROLE_EYEBROW[user.role];

  return (
    <BountyView
      basePath="/bounty"
      filter={parseBountyFilter(params.holat)}
      eyebrow={eyebrowKey ? dictionary[eyebrowKey] : dictionary.admBountyTitle}
    />
  );
}
