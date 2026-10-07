import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { getDictionary, getLocale } from "@/i18n";
import { createAccessToken } from "@/lib/access-token";
import { ROLE_LABEL_KEY } from "@/components/profile/ProfileHero";
import { MyQrCard } from "@/components/access/my-qr-card";

export default async function MyQrPage() {
  const user = await requireUser();
  const dictionary = getDictionary(await getLocale());
  const token = createAccessToken(user.id);
  const label = dictionary[ROLE_LABEL_KEY[user.role]];

  return (
    <>
      <PageHeader title={dictionary.accMyQr} subtitle={user.name} />
      <MyQrCard token={token} name={user.name} roleLabel={label} />
    </>
  );
}
