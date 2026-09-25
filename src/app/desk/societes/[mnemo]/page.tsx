import { DeskNav } from "@/components/DeskNav";
import { SocieteBody } from "@/app/societes/[mnemo]/SocieteBody";
import { companyByMnemo } from "@/lib/reference";
import { requireDesk } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ mnemo: string }>; searchParams: Promise<{ p?: string; depuis?: string }> };

export async function generateMetadata({ params }: Props) {
  const c = await companyByMnemo((await params).mnemo);
  return { title: c ? `${c.shortName} : analyse` : "Société" };
}

/** L'analyse d'une société, lue du desk : les mêmes chiffres, sans l'appel à l'ordre. */
export default async function DeskSocietePage({ params, searchParams }: Props) {
  await requireDesk("/desk/societes");
  return (
    <>
      <DeskNav current="/desk/societes" />
      <SocieteBody params={params} searchParams={searchParams} mode="desk" />
    </>
  );
}
