import { SocieteBody } from "./SocieteBody";
import { companyByMnemo } from "@/lib/reference";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ mnemo: string }>; searchParams: Promise<{ p?: string; depuis?: string }> };

export async function generateMetadata({ params }: Props) {
  const c = await companyByMnemo((await params).mnemo);
  return { title: c ? `${c.shortName} : analyse` : "Société" };
}

export default async function SocietePage({ params, searchParams }: Props) {
  return <SocieteBody params={params} searchParams={searchParams} />;
}
